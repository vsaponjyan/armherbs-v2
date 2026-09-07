import json
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.resolve()
JSON_FILE = SCRIPTS_DIR.parent.parent / "frontend" / "public" / "herbs_data.json"

with open(JSON_FILE, "r", encoding="utf-8") as f:
    herbs = json.load(f)

for herb in herbs:
    herb["img"] = f"/herbs/{herb['id']}.jpg"

with open(JSON_FILE, "w", encoding="utf-8") as f:
    json.dump(herbs, f, ensure_ascii=False, indent=2)

print("🎉 JSON-ը թարմացվեց: Բոլոր հասցեները հիմա տեղական են (Local):")