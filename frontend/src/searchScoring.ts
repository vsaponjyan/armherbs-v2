import { SYNONYMS } from "./searchConfig";
import { QueryIntent } from "./intentDetector";
import { stripArmenianSuffix } from "./utils/armenianStemmer";

export interface Herb {
  id: string;
  name: string;
  alternativeNames: string[];
  healing: string;
  symptoms: string[];
  htmlFile: string;
  embedding: number[];
  usage?: string;
  description?: string;
  chemistry?: string;
}

export const QUALIFIER_WORDS = new Set([
  "վայրի", "անտառային", "լեռնային", "արևելյան", "արևմտյան",
  "սև", "սպիտակ", "կարմիր", "դեղին", "կանաչ",
  "մեծ", "փոքր", "երկար", "կարճ", "հասարակ", "իսկական",
  "բժշկական", "հայկական", "պարսկական", "կովկասյան",
  "ամառային", "ձմեռային", "գարնանային", "աշնանային",
  "ջրային", "ճահճային", "դաշտային", "քարքարոտ",
]);

export const NORMALIZATION_MAP: Readonly<Record<string, string>> = Object.freeze({
  // ԳԼԽԱՑԱՎ ԵՎ ՆԵՅՐՈԼՈԳԻԱ
  "գլխի": "գլուխ",

  // ՍՏԱՄՈՔՍ ԵՎ ՄԱՐՍՈՂՈՒԹՅՈՒՆ
  "մարսողության": "մարսողություն",
  "մարսողությունից": "մարսողություն",
  "մարսողությամբ": "մարսողություն",
  "թթվայնության": "թթվայնություն",
  "թթվայնությունից": "թթվայնություն",
  "դիսպեպսիայի": "դիսպեպսիա",

  // ՍԻՐՏ ԵՎ ՇՐՋԱՆԱՌՈՒԹՅՈՒՆ
  "սրտի": "սիրտ",
  "սրտով": "սիրտ",
  "սրտում": "սիրտ",
  "սրտից": "սիրտ",
  "սրտային": "սիրտ",
  "արյունաճնշման": "արյունաճնշում",
  "հիպերտոնիայի": "հիպերտոնիա",
  "հիպերտոնիայից": "հիպերտոնիա",
  "անեմիայի": "անեմիա",
  "անեմիայից": "անեմիա",
  "արյան": "արյուն",
  "արյունային": "արյուն",

  // ՀԱԶ, ՇՆՉԱՌՈՒԹՅՈՒՆ ԵՎ ԹՈՔԵՐ
  "ասթմայի": "ասթմա",
  "ասթմայից": "ասթմա",
  "շնչառության": "շնչառություն",

  // ՄՐՍԱԾՈՒԹՅՈՒՆ ԵՎ ՎԱՐԱԿՆԵՐ
  "մրսածության": "մրսածություն",
  "մրսածությունից": "մրսածություն",
  "ջերմության": "ջերմություն",
  "ջերմությունից": "ջերմություն",
  "ինֆեկցիայի": "ինֆեկցիա",
  "բորբոքման": "բորբոքում",
  "բորբոքմամբ": "բորբոքում",

  // ՆՅԱՐԴԱՅԻՆ ՀԱՄԱԿԱՐԳ
  "նյարդերի": "նյարդ",
  "նյարդային": "նյարդ",
  "նյարդերից": "նյարդ",
  "անքնության": "անքնություն",
  "անքնությունից": "անքնություն",
  "դեպրեսիայի": "դեպրեսիա",
  "դեպրեսիայից": "դեպրեսիա",
  "անհանգստության": "անհանգստություն",
  "լարվածության": "լարվածություն",
  "լարվածությունից": "լարվածություն",

  // ՓՈՐ ԵՎ ԱՂԻՆԵՐ
  "փորկապության": "փորկապություն",
  "փորկապությունից": "փորկապություն",
  "դիարեայի": "դիարեա",
  "դիարեայից": "դիարեա",

  // ԼՅԱՐԴ ԵՎ ԼԵՂԱՊԱՐԿ
  "լյարդային": "լյարդ",

  // ԵՐԻԿԱՄՆԵՐ ԵՎ ՄԻԶՈՒՂԻՆԵՐ
  "երիկամային": "երիկամ",
  "միզուղիների": "միզուղիներ",

  // ՌԵՎՄԱՏԻԶՄ, ՀՈԴԵՐ ԵՎ ՈՍԿՈՐՆԵՐ
  "հոդերի": "հոդ",
  "հոդերից": "հոդ",

  // ՄԱՇԿ
  "մաշկային": "մաշկ",
  "էկզեմայի": "էկզեմա",
  "էկզեմայից": "էկզեմա",

  // ԿԱՆԱՑԻ ՀԱՄԱԿԱՐԳ
  "հղիության": "հղիություն",
  "հղիությունից": "հղիություն",

  // ԱՐՅՈՒՆ ԵՎ ԱՆՈԹՆԵՐ
  "արյունահոսության": "արյունահոսություն",

  // ԿՈԿՈՐԴ ԵՎ ՔԻԹ
  "քթի": "քիթ",
  "քթից": "քիթ",

  // ԱՅԼ ԸՆԴՀԱՆՈՒՐ
  "հոգնածության": "հոգնածություն",
  "հոգնածությունից": "հոգնածություն",
  "թուլության": "թուլություն",
  "թուլությունից": "թուլություն",
  "թունավորման": "թունավորում",

  // ԲԱՅԱԿԱՆ ՁԵՎԵՐ
  "բուժել": "բուժ",
  "բուժելու": "բուժ",
  "բուժման": "բուժ",
  "բուժիչ": "բուժ",
  "բուժվել": "բուժ",
  "բուժվում": "բուժ",
  "օգտագործել": "օգտագործ",
  "օգտագործելու": "օգտագործ",
  "օգտագործման": "օգտագործ",
  "կիրառել": "կիրառ",
  "կիրառելու": "կիրառ",
  "կիրառման": "կիրառ",
  "պատրաստել": "պատրաստ",
  "պատրաստելու": "պատրաստ",
  "պատրաստման": "պատրաստ",
  "խմել": "խմ",
  "խմելու": "խմ",
});

export function stem(word: string): string {
  const lowerWord = word.toLowerCase();
  if (NORMALIZATION_MAP[lowerWord]) return NORMALIZATION_MAP[lowerWord];
  return stripArmenianSuffix(word);
}

export function normalize(text: string, applyStemming = true): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!applyStemming) return cleaned;
  return cleaned.split(/\s+/).map((w) => stem(w)).join(" ");
}

// --- module-load ժամանակ, մեկ անգամ կառուցվող synonym-index ---
const STEMMED_SYNONYMS = new Map<string, string[]>();
const REVERSE_STEMMED_SYNONYMS = new Map<string, string[]>();

for (const [key, synonyms] of Object.entries(SYNONYMS)) {
  const stemmedKey = stem(key);
  const stemmedSyns = synonyms.flatMap((s) =>
    normalize(s, true).split(/\s+/).filter((w) => w.length > 1)
  );

  const existing = STEMMED_SYNONYMS.get(stemmedKey);
  STEMMED_SYNONYMS.set(stemmedKey, existing
    ? [...new Set([...existing, ...stemmedSyns])]
    : stemmedSyns
  );

  for (const syn of stemmedSyns) {
    if (syn !== stemmedKey) {
      const revExisting = REVERSE_STEMMED_SYNONYMS.get(syn);
      REVERSE_STEMMED_SYNONYMS.set(syn, revExisting
        ? [...new Set([...revExisting, stemmedKey])]
        : [stemmedKey]
      );
    }
  }
}
console.log(`✅ searchScoring: ${STEMMED_SYNONYMS.size} stemmed keys pre-computed.`);

export function expandQuery(query: string): { original: string[]; expanded: string[] } {
  const qNorm = normalize(query);
  const originalWords = qNorm.split(/\s+/).filter((w) => w.length > 1);
  const expandedSet = new Set<string>();

  for (const word of originalWords) {
    const directSyns = STEMMED_SYNONYMS.get(word);
    if (directSyns) directSyns.forEach((s) => expandedSet.add(s));

    const reverseKeys = REVERSE_STEMMED_SYNONYMS.get(word);
    if (reverseKeys) reverseKeys.forEach((k) => expandedSet.add(k));
  }

  originalWords.forEach((w) => expandedSet.delete(w));
  return { original: originalWords, expanded: Array.from(expandedSet) };
}

export function getNameMatchScore(
  query: string,
  herb: Herb
): { score: number; type: "exact" | "fuzzy" | null } {
  const qNorm = normalize(query, false);
  const qStem = normalize(query, true);
  const allNames = [herb.name, ...herb.alternativeNames];
  const allNamesNorm = allNames.map((n) => normalize(n, false));
  const allNamesStem = allNames.map((n) => normalize(n, true));

  if (allNamesStem.some((n) => n === qStem) || allNamesNorm.some((n) => n === qNorm)) {
    return { score: 1.0, type: "exact" };
  }
  if (allNamesStem.some((n) => n.length >= 2 && qStem.includes(n))) {
    return { score: 0.98, type: "exact" };
  }
  if (allNamesNorm.some((n) => n.length >= 2 && qNorm.includes(n))) {
    return { score: 0.97, type: "exact" };
  }

  const qWordsStem = qStem.split(/\s+/).filter((w) => w.length >= 4);
  const qWordsNorm = qNorm.split(/\s+/).filter((w) => w.length >= 4);
  const mainNameStem = normalize(herb.name, true);
  const mainNameNorm = normalize(herb.name, false);

  for (const qWord of qWordsStem) {
    if (mainNameStem.includes(qWord)) return { score: 0.95, type: "fuzzy" };
  }
  for (const qWord of qWordsNorm) {
    if (mainNameNorm.includes(qWord)) return { score: 0.93, type: "fuzzy" };
  }

  for (const altName of herb.alternativeNames) {
    const altNorm = normalize(altName, false);
    const altStem = normalize(altName, true);
    const altWords = altStem.split(/\s+/).filter((w) => w.length >= 3);

    if (altWords.length === 1) {
      if (QUALIFIER_WORDS.has(altWords[0])) continue;
      for (const qWord of qWordsStem) {
        if (altStem.includes(qWord) || qWord.includes(altStem)) return { score: 0.90, type: "fuzzy" };
      }
      for (const qWord of qWordsNorm) {
        if (altNorm.includes(qWord) || qWord.includes(altNorm)) return { score: 0.88, type: "fuzzy" };
      }
    } else {
      const significantAltWords = altWords.filter((w) => !QUALIFIER_WORDS.has(w));
      if (significantAltWords.length === 0) continue;

      const matchCount = significantAltWords.filter((aw) =>
        qWordsStem.some((qw) => qw.includes(aw) || aw.includes(qw))
      ).length;

      if (matchCount / significantAltWords.length >= 0.75) {
        const qualifierWords = altWords.filter((w) => QUALIFIER_WORDS.has(w));
        const qualifierMatch = qualifierWords.length === 0 || qualifierWords.some((qw) => qNorm.includes(qw));
        return { score: qualifierMatch ? 0.90 : 0.70, type: "fuzzy" };
      }
    }
  }

  for (const herbName of allNamesNorm) {
    for (const nameWord of herbName.split(/\s+/).filter((w) => w.length >= 4)) {
      if (QUALIFIER_WORDS.has(nameWord)) continue;
      if (qNorm.includes(nameWord)) return { score: 0.88, type: "fuzzy" };
    }
  }

  return { score: 0, type: null };
}

export function fieldLexicalScore(query: string, fieldText: string): number {
  const { original, expanded } = expandQuery(query);
  const fieldNorm = normalize(fieldText, true);
  let score = 0, maxScore = 0;

  for (const word of original) {
    maxScore += 1.0;
    if (fieldNorm.includes(word)) score += 1.0;
  }
  for (const word of expanded) {
    maxScore += 0.6;
    if (fieldNorm.includes(word)) score += 0.6;
  }
  return maxScore > 0 ? score / maxScore : 0;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function hybridScore(
  semanticNorm: number,
  lexical: number,
  nameMatchScore: number,
  intent: QueryIntent
): number {
  const weights: Record<QueryIntent, { s: number; l: number }> = {
    HERB_NAME:  { s: 0.10, l: 0.90 },
    SYMPTOM:    { s: 0.65, l: 0.35 },
    USAGE:      { s: 0.55, l: 0.45 },
    GENERAL:    { s: 0.55, l: 0.45 },
    COMPARISON: { s: 0.50, l: 0.50 },
    HERB_INFO:  { s: 0.45, l: 0.55 },
  };
  const w = weights[intent] ?? weights.GENERAL;
  let score = w.s * semanticNorm + w.l * lexical;

  if (nameMatchScore > 0) {
    score = Math.min(1.0, score + nameMatchScore * 0.25);
  }
  if (intent === "HERB_NAME" && lexical < 0.1) score *= 0.5;
  return score;
}