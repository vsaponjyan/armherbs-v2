import json
from pathlib import Path

# Finding the JSON address
SCRIPTS_DIR = Path(__file__).parent.resolve()
JSON_FILE = SCRIPTS_DIR.parent.parent / "frontend" / "public" / "herbs_data.json"

# 1. Reading JSON
with open(JSON_FILE, "r", encoding="utf-8") as f:
    herbs = json.load(f)

# 2. Changing img addresses
for herb in herbs:
    # We take the id from herbs_data.json and create a new address
    herb["img"] = f"/herbs/{herb['id']}.jpg"

# 3. We save in the same JSON file
with open(JSON_FILE, "w", encoding="utf-8") as f:
    json.dump(herbs, f, ensure_ascii=False, indent=2)

print("🎉 JSON-ը թարմացվեց: Բոլոր հասցեները հիմա տեղական են (Local):")