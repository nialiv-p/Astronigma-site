#!/usr/bin/env python3
"""Validate website release data against the site, Unity project, and ASO metadata."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any


EXPECTED_LOCALES = {
    "en": "en-US",
    "ru": "ru",
    "sr": "sr-Latn",
    "es": "es",
    "pt": "pt-BR",
    "de": "de",
    "fr": "fr",
    "ja": "ja",
    "ko": "ko",
    "tr": "tr",
    "th": "th",
    "id": "id",
    "zh": "zh-Hans",
}
EXPECTED_FEATURES = {"saga", "practice", "daily_challenge", "seasonal_missions"}
EXPECTED_ASO_FIELDS = {
    "App Name",
    "Subtitle",
    "Short Description",
    "Keywords",
    "Promotional Text",
    "Description",
    "Release Notes",
}


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def require(self, condition: bool, message: str) -> None:
        if not condition:
            self.errors.append(message)

    def warn(self, condition: bool, message: str) -> None:
        if not condition:
            self.warnings.append(message)


def load_json(path: Path, report: Report) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        report.errors.append(f"Cannot read valid JSON from {path}: {error}")
        return {}
    report.require(isinstance(value, dict), "product.json root must be an object")
    return value if isinstance(value, dict) else {}


def validate_manifest(manifest: dict[str, Any], report: Report) -> None:
    required = {
        "schema_version",
        "app_version",
        "content_updated",
        "constellation_count",
        "platforms",
        "locales",
        "features",
    }
    report.require(required <= manifest.keys(), f"product.json is missing keys: {sorted(required - manifest.keys())}")
    report.require(manifest.get("schema_version") == 1, "schema_version must be 1")
    report.require(bool(re.fullmatch(r"\d+\.\d+\.\d+", str(manifest.get("app_version", "")))), "app_version must use x.y.z")
    try:
        date.fromisoformat(str(manifest.get("content_updated", "")))
    except ValueError:
        report.errors.append("content_updated must be an ISO date (YYYY-MM-DD)")
    report.require(isinstance(manifest.get("constellation_count"), int), "constellation_count must be an integer")
    report.require(manifest.get("constellation_count", 0) > 0, "constellation_count must be positive")

    locales = manifest.get("locales", [])
    report.require(isinstance(locales, list), "locales must be an array")
    if isinstance(locales, list):
        report.require(len(locales) == len(set(locales)), "locales must not contain duplicates")
        report.require(set(locales) == set(EXPECTED_LOCALES), f"locales must be {sorted(EXPECTED_LOCALES)}")

    platforms = manifest.get("platforms", {})
    report.require(set(platforms) == {"ios", "android"}, "platforms must contain ios and android")
    for platform in ("ios", "android"):
        value = platforms.get(platform, {}) if isinstance(platforms, dict) else {}
        report.require(isinstance(value, dict) and str(value.get("store_url", "")).startswith("https://"), f"{platform}.store_url must be HTTPS")

    features = manifest.get("features", {})
    report.require(isinstance(features, dict), "features must be an object")
    if isinstance(features, dict):
        report.require(set(features) == EXPECTED_FEATURES, f"features must be {sorted(EXPECTED_FEATURES)}")
        report.require(all(features.values()), "all release-manifest features must be enabled")


def validate_site(site_root: Path, manifest: dict[str, Any], report: Report, require_ga4: bool) -> None:
    index = (site_root / "index.html").read_text(encoding="utf-8")
    localization = (site_root / "localization.js").read_text(encoding="utf-8")
    stage2_localization = (site_root / "stage2-localization.js").read_text(encoding="utf-8")
    script = (site_root / "script.js").read_text(encoding="utf-8")
    lights_out = (site_root / "lights-out.js").read_text(encoding="utf-8")
    stylesheet = (site_root / "style.css").read_text(encoding="utf-8")
    analytics = (site_root / "analytics.js").read_text(encoding="utf-8")
    privacy = (site_root / "privacy.html").read_text(encoding="utf-8")
    terms = (site_root / "terms.html").read_text(encoding="utf-8")
    sitemap = (site_root / "sitemap.xml").read_text(encoding="utf-8")

    locales = manifest.get("locales", [])
    translation_locales = set(re.findall(r'^    "([a-z]{2})": \{', localization, re.MULTILINE))
    supported_match = re.search(r"this\.supportedLangs\s*=\s*\[([^]]+)]", localization)
    supported_locales = set(re.findall(r"'([a-z]{2})'", supported_match.group(1))) if supported_match else set()
    report.require(set(locales) == translation_locales, "product locales and translation blocks differ")
    report.require(set(locales) == supported_locales, "product locales and LocalizationManager.supportedLangs differ")
    consent_block = analytics.split("const consentTranslations = {", 1)[-1].split("class AstronigmaAnalytics", 1)[0]
    consent_locales = set(re.findall(r"^\s{8}([a-z]{2}): \{", consent_block, re.MULTILINE))
    report.require(set(locales) == consent_locales, "product locales and consent translations differ")

    stage2_blocks = re.findall(
        r"^    ([a-z]{2}): \{\n(.*?)(?=^    [a-z]{2}: \{|^\};)",
        stage2_localization,
        re.MULTILINE | re.DOTALL,
    )
    stage2_locales = {locale for locale, _ in stage2_blocks}
    report.require(set(locales) == stage2_locales, "product locales and Stage 2 translation blocks differ")
    stage2_key_sets = {
        locale: set(re.findall(r"(?:^|,)\s*([a-z][a-z0-9_]*):", block, re.MULTILINE))
        for locale, block in stage2_blocks
    }
    english_stage2_keys = stage2_key_sets.get("en", set())
    report.require(len(english_stage2_keys) >= 50, "Stage 2 localization must contain the complete conversion-page key set")
    for locale in locales:
        report.require(stage2_key_sets.get(locale) == english_stage2_keys, f"Stage 2 translation keys differ for {locale}")

    for locale in locales:
        for number in range(1, 6):
            report.require((site_root / f"assets/screenshots/{locale}_{number}.png").is_file(), f"missing full screenshot {locale}_{number}.png")
            report.require((site_root / f"assets/screenshots/thumbs/{locale}_{number}.png").is_file(), f"missing thumbnail {locale}_{number}.png")
            report.require((site_root / f"assets/screenshots/thumbs-webp/{locale}_{number}.webp").is_file(), f"missing WebP thumbnail {locale}_{number}.webp")

    platforms = manifest.get("platforms", {})
    for platform, data in platforms.items():
        store_url = data.get("store_url", "")
        report.require(index.count(f'href="{store_url}"') == 3, f"{platform} store URL must appear exactly three times in index.html")
    report.require(index.count('data-placement="hero"') == 2, "hero must contain two instrumented store links")
    report.require(index.count('data-placement="demo_reveal"') == 2, "demo reveal must contain two instrumented store links")
    report.require(index.count('data-placement="final"') == 2, "final CTA must contain two instrumented store links")

    for section_id in ("hero", "journey", "features", "collection", "gallery", "download"):
        report.require(f'id="{section_id}"' in index, f"conversion page section is missing: {section_id}")
    report.require('<div id="lights-out-grid"' in index, "playable Lights Out grid is missing")
    report.require('aria-pressed' in script, "demo cells must expose aria-pressed")
    report.require('document.hidden' in script, "starfield must pause in hidden tabs")
    report.require("Math.min(window.devicePixelRatio || 1, 1.5)" in script, "starfield DPR must be capped")
    report.require("prefers-reduced-motion" in script and "prefers-reduced-motion" in stylesheet, "reduced motion support is missing")
    report.require("new Audio" in script and "ensureSounds()" in script, "lazy audio manager is missing")
    report.require("new Audio" not in index, "audio must not be created from the initial HTML")
    report.require("createBoardFromMask" in lights_out and "SOLUTION_MASKS" in lights_out, "solvable-mask demo engine is missing")

    required_assets = [
        "assets/images/game/constellation-key.png", "assets/images/game/constellation-key.webp",
        "assets/images/game/calendar.png", "assets/images/game/calendar.webp",
        "assets/images/game/missions.png", "assets/images/game/missions.webp",
        "assets/images/game/light-shards.png", "assets/images/game/light-shards.webp",
        "assets/images/game/lenses.png", "assets/images/game/lenses.webp",
        "assets/fonts/Inter-Regular.woff2", "assets/fonts/Inter-Bold.woff2", "assets/fonts/Inter-LICENSE.txt",
    ]
    for relative_path in required_assets:
        report.require((site_root / relative_path).is_file(), f"missing Stage 2 asset: {relative_path}")
    report.require("fonts.googleapis.com" not in index and "fonts.gstatic.com" not in index, "external Google Fonts requests are forbidden")
    report.require("loading = 'lazy'" in localization and "decoding = 'async'" in localization, "gallery thumbnails must be lazy and async-decoded")
    report.require("thumbs-webp" in localization, "gallery must use WebP thumbnails")
    report.require("assets/screenshots/${this.currentLang}_${i}.png" in localization, "lightbox full-size screenshot source is missing")

    initial_files = ["index.html", "style.css", "localization.js", "stage2-localization.js", "analytics.js", "lights-out.js", "script.js", "assets/fonts/Inter-Regular.woff2", "assets/fonts/Inter-Bold.woff2"]
    initial_bytes = sum((site_root / relative_path).stat().st_size for relative_path in initial_files)
    report.require(initial_bytes <= 750 * 1024, f"estimated initial transfer is {initial_bytes / 1024:.1f} KiB; target is 750 KiB")

    count = manifest.get("constellation_count")
    report.require(str(count) in index, "index.html must contain the manifest constellation count")
    report.require(str(manifest.get("content_updated")) in sitemap, "sitemap lastmod must match content_updated")
    report.require("privacy: './privacy.html'" in terms, "Terms must link to privacy.html")
    report.require("p.replaceAll('${LINKS.privacy}', LINKS.privacy)" in terms, "Terms must resolve localized Privacy link templates")
    report.require("const ORDER = ['intro', 'collect', 'use', 'third', 'ads', 'analytics', 'web'" in privacy, "Privacy must include website analytics in its table of contents")
    report.require(len(re.findall(r"^\s+web: \{", privacy, re.MULTILINE)) == len(locales), "Privacy must contain website-analytics copy for every locale")
    report.require("https://policies.google.com/privacy" in privacy, "Privacy must link to Google's Privacy Policy")

    for event in ("page_view", "language_change", "store_click", "demo_start", "demo_complete"):
        report.require(f"'{event}'" in analytics or f"'{event}'" in script, f"missing analytics event contract: {event}")
    report.require("send_page_view: false" in analytics, "GA4 automatic page_view must be disabled")
    report.require("astronigma_analytics_consent_v1" in analytics, "versioned analytics consent key is missing")
    report.require("googletagmanager.com/gtag/js" not in index, "Google Tag must not load directly from index.html")

    measurement_match = re.search(r"const DEFAULT_GA4_MEASUREMENT_ID = '([^']*)'", analytics)
    measurement_id = measurement_match.group(1) if measurement_match else ""
    measurement_valid = bool(re.fullmatch(r"G-[A-Z0-9]+", measurement_id, re.IGNORECASE)) and measurement_id != "G-XXXXXXXXXX"
    if require_ga4:
        report.require(measurement_valid, "a real GA4 Measurement ID is required")
    else:
        report.warn(measurement_valid, "GA4 Measurement ID is not configured; consent works but analytics remains disabled")


def validate_unity(unity_root: Path, manifest: dict[str, Any], report: Report) -> None:
    project_settings = unity_root / "ProjectSettings/ProjectSettings.asset"
    saga_config = unity_root / "Assets/GameAssets/Features/Saga/Configs/SagaConfig.asset"
    installer = unity_root / "Assets/Scripts/Core/MainGameInstaller.cs"
    for path in (project_settings, saga_config, installer):
        report.require(path.is_file(), f"missing Unity source: {path}")
    if report.errors and not all(path.is_file() for path in (project_settings, saga_config, installer)):
        return

    settings_text = project_settings.read_text(encoding="utf-8")
    version_match = re.search(r"^\s*bundleVersion:\s*(\S+)", settings_text, re.MULTILINE)
    report.require(bool(version_match), "Unity bundleVersion was not found")
    if version_match:
        report.require(version_match.group(1) == manifest.get("app_version"), "Unity bundleVersion and product app_version differ")

    saga_text = saga_config.read_text(encoding="utf-8")
    chapter_count = len(re.findall(r"^\s*- ChapterConfigKey:", saga_text, re.MULTILINE))
    report.require(chapter_count == manifest.get("constellation_count"), f"Unity has {chapter_count} saga chapters, manifest has {manifest.get('constellation_count')}")

    installer_text = installer.read_text(encoding="utf-8")
    report.require("DailyChallengeInstaller.Install(Container);" in installer_text, "Unity Daily Challenge feature is not installed")
    report.require("MissionsInstaller.Install(Container);" in installer_text, "Unity Missions feature is not installed")
    report.require((unity_root / "Assets/Scripts/Features/Saga/Implementation/SagaPracticeLevelAttemptPort.cs").is_file(), "Unity Practice mode implementation was not found")


def validate_aso(aso_path: Path, manifest: dict[str, Any], report: Report) -> None:
    try:
        with aso_path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
            columns = set(reader.fieldnames or [])
    except OSError as error:
        report.errors.append(f"Cannot read ASO metadata {aso_path}: {error}")
        return

    report.require(EXPECTED_ASO_FIELDS == {row.get("Field", "") for row in rows}, "ASO field rows differ from the expected seven fields")
    aso_locales = columns - {"Field", "Character Limit"}
    expected_aso_locales = {EXPECTED_LOCALES[locale] for locale in manifest.get("locales", []) if locale in EXPECTED_LOCALES}
    report.require(aso_locales == expected_aso_locales, "ASO locale columns and product locales differ")

    count = str(manifest.get("constellation_count"))
    by_field = {row.get("Field"): row for row in rows}
    description = by_field.get("Description", {})
    for locale in expected_aso_locales:
        report.require(count in description.get(locale, ""), f"ASO Description/{locale} does not mention {count} constellations")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    default_root = Path(__file__).resolve().parents[1]
    parser.add_argument("--site-root", type=Path, default=default_root)
    parser.add_argument("--manifest", type=Path, help="Override product.json (useful for validation tests)")
    parser.add_argument("--unity-project", type=Path, help="Validate version, chapters, and release features against Unity")
    parser.add_argument("--aso-metadata", type=Path, help="Validate locales and product facts against ASO_Metadata.csv")
    parser.add_argument("--require-ga4", action="store_true", help="Fail if GA4_MEASUREMENT_ID is not configured")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    site_root = args.site_root.resolve()
    manifest_path = (args.manifest or site_root / "product.json").resolve()
    report = Report()
    manifest = load_json(manifest_path, report)
    if manifest:
        validate_manifest(manifest, report)
        validate_site(site_root, manifest, report, args.require_ga4)
        if args.unity_project:
            validate_unity(args.unity_project.resolve(), manifest, report)
        if args.aso_metadata:
            validate_aso(args.aso_metadata.resolve(), manifest, report)

    for warning in report.warnings:
        print(f"WARNING: {warning}")
    for error in report.errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if report.errors:
        print(f"Validation failed with {len(report.errors)} error(s).", file=sys.stderr)
        return 1
    print("Site release validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
