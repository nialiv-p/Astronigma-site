#!/usr/bin/env python3
"""
deploy_screenshots.py
---------------------
Copies store screenshots from Unity's export folder into astronigma-site.

Unity export structure:
  <unity_export_root>/1080x1920_Phone/<LANG_CODE>/Screenshot_1.png ... Screenshot_5.png

Site structure:
  assets/screenshots/<lang>_<n>.png
  assets/screenshots/thumbs/<lang>_<n>.png   (600x1066)

Usage:
  python3 tools/deploy_screenshots.py <unity_export_root>

Example:
  python3 tools/deploy_screenshots.py /Users/nialiv/Documents/Development/lightbulbs/Screenshots
"""

import os
import sys
import shutil
import subprocess

# Map from Unity language folder name → site language code
LANG_MAP = {
    "EN":       "en",
    "RU":       "ru",
    "DE":       "de",
    "ES":       "es",
    "FR":       "fr",
    "ID":       "id",
    "JA":       "ja",
    "KO":       "ko",
    "PT-BR":    "pt",
    "SR-LATN":  "sr",
    "TH":       "th",
    "TR":       "tr",
    "ZH-CN":    "zh",
}

PRESET = "1080x1920_Phone"
SCREENSHOT_COUNT = 5
THUMB_WIDTH = 600
THUMB_HEIGHT = 1066

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENSHOTS_DIR = os.path.join(SITE_ROOT, "assets", "screenshots")
THUMBS_DIR = os.path.join(SCREENSHOTS_DIR, "thumbs")


def make_thumb(src_path: str, dst_path: str) -> None:
    """Resize image with sips (macOS native, no dependencies)."""
    subprocess.run(
        ["sips", "-Z", str(max(THUMB_WIDTH, THUMB_HEIGHT)),
         "--resampleHeightWidth", str(THUMB_HEIGHT), str(THUMB_WIDTH),
         src_path, "--out", dst_path],
        check=True,
        capture_output=True,
    )


def deploy(unity_export_root: str) -> None:
    preset_path = os.path.join(unity_export_root, PRESET)
    if not os.path.isdir(preset_path):
        print(f"ERROR: Preset folder not found: {preset_path}")
        print(f"  Expected: {unity_export_root}/{PRESET}/")
        sys.exit(1)

    os.makedirs(THUMBS_DIR, exist_ok=True)

    total_copied = 0
    missing = []

    for unity_lang, site_lang in LANG_MAP.items():
        lang_dir = os.path.join(preset_path, unity_lang)
        if not os.path.isdir(lang_dir):
            print(f"  [SKIP] Language folder not found: {unity_lang}")
            continue

        for i in range(1, SCREENSHOT_COUNT + 1):
            src = os.path.join(lang_dir, f"Screenshot_{i}.png")
            if not os.path.isfile(src):
                missing.append(f"{unity_lang}/Screenshot_{i}.png")
                continue

            # Full-size
            dst = os.path.join(SCREENSHOTS_DIR, f"{site_lang}_{i}.png")
            shutil.copy2(src, dst)

            # Thumbnail
            thumb_dst = os.path.join(THUMBS_DIR, f"{site_lang}_{i}.png")
            make_thumb(src, thumb_dst)

            total_copied += 1
            print(f"  ✓ {unity_lang}/Screenshot_{i}.png  →  {site_lang}_{i}.png")

    print(f"\nDone. {total_copied} screenshots deployed.")
    if missing:
        print(f"\nMissing (skipped):")
        for m in missing:
            print(f"  - {m}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    unity_export_root = sys.argv[1]
    if not os.path.isdir(unity_export_root):
        print(f"ERROR: Path does not exist: {unity_export_root}")
        sys.exit(1)

    print(f"Source: {unity_export_root}/{PRESET}/")
    print(f"Target: {SCREENSHOTS_DIR}/\n")
    deploy(unity_export_root)
