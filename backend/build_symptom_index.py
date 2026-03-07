import json
from pathlib import Path
from collections import defaultdict, Counter

# ===============================
# Paths
# ===============================
backend_dir     = Path(__file__).parent.resolve()
herbs_data_path = backend_dir / "herbs_raw_data.json"
output_path     = backend_dir / "symptom_index.json"

if not herbs_data_path.exists():
    print(f"❌ ՍԽԱԼ: {herbs_data_path} չի գտնվել!")
    exit(1)

with open(herbs_data_path, "r", encoding="utf-8") as f:
    herbs = json.load(f)

print(f"📚 Բեռնված է {len(herbs)} դեղաբույս\n")

# ===============================
# Stopwords
# ===============================
ARMENIAN_STOPWORDS = {
    "է", "են", "ի", "ու", "եւ", "և", "որ", "դա", "մի", "այն",
    "կա", "կան", "ում", "ից", "ով", "ին", "նաև", "այս", "դեպի",
    "համար", "կամ", "մինչ", "բայց", "ապա", "հետո", "նաեւ",
    "մեջ", "վրա", "տակ", "առ", "ըստ", "ամեն", "ոչ", "ոտ"
}

def extract_words(text: str) -> list[str]:
    """Տեքստից հանել 4+ տառ բառեր, stopwords-ը հանած։"""
    return [
        w.strip(",.։;՝()[]«»")
        for w in text.split()
        if len(w.strip(",.։;՝()[]«»")) >= 4
        and w.strip(",.։;՝()[]«»") not in ARMENIAN_STOPWORDS
    ]

# ===============================
# 1. Symptom co-occurrence index
# ===============================
symptom_cooccurrence: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

for herb in herbs:
    symptoms = [s.strip().lower() for s in herb.get("symptoms", []) if s.strip()]
    for symptom in symptoms:
        for related in symptoms:
            if related != symptom:
                symptom_cooccurrence[symptom][related] += 1

symptom_healing_keywords: dict[str, list[str]] = defaultdict(list)

CONTEXT_WINDOW = 150  # ±150 նիշ symptom-ի շուրջ

for herb in herbs:
    symptoms  = [s.strip().lower() for s in herb.get("symptoms", []) if s.strip()]
    healing   = herb.get("healing", "").lower()
    usage     = herb.get("usage", "").lower()
    full_text = healing + " " + usage

    for symptom in symptoms:
        pos = full_text.find(symptom)
        if pos == -1:
            continue

        # ±150 նիշ context symptom-ի շուրջ
        context_start = max(0, pos - CONTEXT_WINDOW)
        context_end   = min(len(full_text), pos + len(symptom) + CONTEXT_WINDOW)
        context       = full_text[context_start:context_end]

        # Context-ի բառերը — symptom-ն ինքը հանած
        context_words = [
            w for w in extract_words(context)
            if w != symptom
        ]

        # Counter — ամենահաճախ = ամենառելևանտ
        counted  = Counter(context_words)
        relevant = [w for w, _ in counted.most_common(6)]

        symptom_healing_keywords[symptom].extend(relevant)

# ===============================
# 3. Herb name index
# ===============================
herb_name_index: dict[str, str] = {}

for herb in herbs:
    canonical = herb["name"].lower()
    herb_name_index[canonical] = herb["name"]
    for alt in herb.get("alternativeNames", []):
        herb_name_index[alt.strip().lower()] = herb["name"]

# ===============================
# 4. Field vocabulary per herb
# ===============================
herb_vocabulary: dict[str, list[str]] = {}

for herb in herbs:
    name     = herb["name"].lower()
    healing  = herb.get("healing", "").lower()
    usage    = herb.get("usage", "").lower()
    symptoms = [s.lower() for s in herb.get("symptoms", [])]

    full  = healing + " " + usage
    words = list(dict.fromkeys(extract_words(full)))  # dedup, order-preserved

    herb_vocabulary[name] = symptoms[:6] + words[:8]

# ===============================
# 5. Assemble final index
# ===============================
final_index = {
    "symptom_cooccurrence": {
        symptom: [
            item[0]
            for item in sorted(related.items(), key=lambda x: -x[1])[:5]
        ]
        for symptom, related in symptom_cooccurrence.items()
    },
    "symptom_keywords": {
        symptom: list(dict.fromkeys(keywords))[:8]
        for symptom, keywords in symptom_healing_keywords.items()
    },
    "herb_name_index": herb_name_index,
    "herb_vocabulary": herb_vocabulary,
}

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(final_index, f, ensure_ascii=False, indent=2)

# ===============================
# Stats
# ===============================
print(f"✅ Symptom co-occurrence: {len(final_index['symptom_cooccurrence'])} entries")
print(f"✅ Symptom keywords:      {len(final_index['symptom_keywords'])} entries")
print(f"✅ Herb name index:       {len(final_index['herb_name_index'])} entries")
print(f"✅ Herb vocabulary:       {len(final_index['herb_vocabulary'])} entries")
print(f"\n📁 Saved → {output_path}")
print("\n🔍 Sample expansions:")

sample_symptoms = list(final_index["symptom_cooccurrence"].keys())[:3]
for s in sample_symptoms:
    co   = final_index["symptom_cooccurrence"].get(s, [])
    keys = final_index["symptom_keywords"].get(s, [])
    print(f"  '{s}' → co-occur: {co[:3]} | keywords: {keys[:3]}")

# ✅ Ready to run:
# ./venv/bin/python build_symptom_index.py
