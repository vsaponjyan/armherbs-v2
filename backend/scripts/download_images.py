import json
import requests
from pathlib import Path
import time

# 1. Determine the paths
# __file__ is download_images.py
# .parent is the scripts folder
# .parent.parent is the backend folder
# .parent.parent.parent is the armherbs-v2 (top-level) folder

SCRIPTS_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPTS_DIR.parent.parent  # Սա armherbs-v2 պանակն է

# The correct address to my JSON file
JSON_FILE = ROOT_DIR / "frontend" / "public" / "herbs_data.json"

# The exact address where the images should appear
IMAGE_DIR = ROOT_DIR / "frontend" / "public" / "herbs"

# Create the herbs folder if it doesn't already exist.
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

# 2. Reading JSON
if not JSON_FILE.exists():
    print(f"❌ ՍԽԱԼ: Չգտա JSON ֆայլը այստեղ՝ {JSON_FILE}")
    exit(1)

with open(JSON_FILE, "r", encoding="utf-8") as f:
    herbs = json.load(f)

print(f"🚀 Սկսում ենք ներբեռնել {len(herbs)} նկար...")

# 3.Download process
for herb in herbs:
    herb_id = herb.get("id")
    image_url = herb.get("img")

    if not herb_id or not image_url:
        continue

    # Finding out the file name
    file_name = f"{herb_id}.jpg"
    file_path = IMAGE_DIR / file_name

    try:
        # We check if the image already exists, so we don't upload it again.
        if file_path.exists():
            print(f"⏭️  Արդեն կա: {file_name}")
            continue

        response = requests.get(image_url, timeout=15)
        if response.status_code == 200:
            with open(file_path, "wb") as img_file:
                img_file.write(response.content)
            print(f"✅ Պահպանվեց: {file_name}")
        else:
            print(f"⚠️ Չստացվեց: {herb_id} (Status: {response.status_code})")
    except Exception as e:
        print(f"❌ Սխալ {herb_id}-ի հետ: {e}")

    time.sleep(0.3)

print(f"\n🎉 Պատրաստ է! Նկարները այստեղ են՝ {IMAGE_DIR}")