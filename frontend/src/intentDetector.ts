// src/intentDetector.ts

import { Herb } from "./searchEngine";
import { QueryIntent, INTENT_KEYWORDS, SYNONYMS, ARMENIAN_SUFFIXES } from "./searchConfig";

export type { QueryIntent };

function stem(word: string): string {
  if (word.length <= 3) return word;
  let stemmed = word;
  for (const suffix of ARMENIAN_SUFFIXES) {
    if (stemmed.endsWith(suffix) && stemmed.length - suffix.length >= 3) {
      stemmed = stemmed.slice(0, -suffix.length);
      break;
    }
  }
  return stemmed;
}

const STEMMED_SYNONYM_KEYS: Set<string> = new Set(
  Object.keys(SYNONYMS).map((key) => stem(key))
);

const STEMMED_USAGE_KEYWORDS: string[] = Array.from(new Set([
  ...INTENT_KEYWORDS.USAGE,
  "թեյ",
  "կիրառ",
  "օգտագործ",
  "պատրաստ",
  "խմ",
  "բուժ",
].map((kw) => stem(kw))));

const STEMMED_SYMPTOM_KEYWORDS: string[] = INTENT_KEYWORDS.SYMPTOM.map((kw) =>
  stem(kw)
);

export function detectIntent(query: string, herbs?: Herb[]): QueryIntent {
  const q        = query.toLowerCase().trim();
  const qWords   = q.split(/\s+/).map((w) => stem(w));
  const qStemmed = qWords.join(" ");

  // ── USAGE ──────────────────────────────────────────────────────────────
  if (STEMMED_USAGE_KEYWORDS.some((kw) => qStemmed.includes(kw))) {
    return "USAGE";
  }

  // ── COMPARISON ─────────────────────────────────────────────────────────
  if (/տարբերություն|համեմատ|լավագույն|ավելի լավ|ո՞րը/.test(q)) {
    return "COMPARISON";
  }

  // ── HERB_INFO ──────────────────────────────────────────────────────────
  if (/ի՞նչ է|ի՞նչ ունի|նկարագր|մասին|ինչ բույս/.test(q)) {
    return "HERB_INFO";
  }

  // ── HERB_NAME ──────────────────────────────────────────────────────────
  // ✅ SYMPTOM-ից առաջ — որ «վալերիան ախտանշաններ»-ը HERB_NAME ստանա
  if (herbs?.some((h) => q.includes(h.name.toLowerCase()))) {
    return "HERB_NAME";
  }

  // ── SYMPTOM ────────────────────────────────────────────────────────────
  const hasSymptomKeyword = STEMMED_SYMPTOM_KEYWORDS.some((kw) =>
    qStemmed.includes(kw)
  );
  const hasSymptomSynonym = qWords.some((w) =>
    STEMMED_SYNONYM_KEYS.has(w)
  );
  if (hasSymptomKeyword || hasSymptomSynonym) {
    return "SYMPTOM";
  }

  return "GENERAL";
}
