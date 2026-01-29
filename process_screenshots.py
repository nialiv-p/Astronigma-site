
import os
import shutil
import subprocess

# Configuration
SOURCE_BASE = "/Users/nialiv/Library/Mobile Documents/com~apple~CloudDocs/Development/AstronigmaDesign/Screenshots/1080x1920_Phone"
DEST_BASE = "/Users/nialiv/Documents/GitHub/astronigma-site/assets/screenshots"
THUMB_BASE = "/Users/nialiv/Documents/GitHub/astronigma-site/assets/screenshots/thumbs"

# Mapping: Source Folder Name -> Website Lang Code
LANG_MAP = {
    "EN": "en",
    "RU": "ru",
    "SR-LATN": "sr",
    "ES": "es",
    "PT-BR": "pt",
    "DE": "de",
    "FR": "fr",
    "JA": "ja",
    "KO": "ko",
    "TR": "tr",
    "TH": "th",
    "ID": "id",
    "ZH-CN": "zh"
}

def process_screenshots():
    for source_lang, dest_lang in LANG_MAP.items():
        source_dir = os.path.join(SOURCE_BASE, source_lang)
        
        if not os.path.exists(source_dir):
            print(f"Warning: Source directory not found: {source_dir}")
            continue
            
        print(f"Processing {source_lang} -> {dest_lang}...")
        
        for i in range(1, 6):
            filename = f"Screenshot_{i}.png"
            source_path = os.path.join(source_dir, filename)
            
            if not os.path.exists(source_path):
                print(f"  Warning: File not found: {source_path}")
                continue
                
            # Define text filenames
            new_filename = f"{dest_lang}_{i}.png"
            dest_path = os.path.join(DEST_BASE, new_filename)
            thumb_path = os.path.join(THUMB_BASE, new_filename)
            
            # Copy full size
            shutil.copy2(source_path, dest_path)
            
            # Generate thumbnail using sips (macOS built-in image processor)
            # Resizing to width 800px for Retina display sharpness (at 300px CSS width)
            subprocess.run([
                "sips", "-Z", "800", source_path, "--out", thumb_path
            ], check=True, stdout=subprocess.DEVNULL)
            
    print("Done processing screenshots.")

if __name__ == "__main__":
    process_screenshots()
