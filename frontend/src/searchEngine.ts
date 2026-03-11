// src/searchEngine.ts

import {
  FIELD_WEIGHTS,
  SYNONYMS,
  ARMENIAN_SUFFIXES,
} from "./searchConfig";

import { detectIntent, QueryIntent } from "./intentDetector";

export type { QueryIntent };
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

export interface SearchResult extends Herb {
  semanticScore?: number;
  lexScore?: number;
  finalScore?: number;
  intent?: QueryIntent;
  matchType?: "exact" | "fuzzy" | "semantic";
  scoreBreakdown?: {
    nameScore: number;
    symptomScore: number;
    healingScore: number;
    semanticRaw: number;
    semanticNorm: number;
    lexical: number;
    final: number;
  };
}

export class HerbSearchEngine {
  private herbs: Herb[] | null = null;
  private loaded = false;
  private cache = new Map<string, { results: SearchResult[]; timestamp: number }>();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000;
  private readonly CACHE_MAX_SIZE = 100;

  private readonly QUALIFIER_WORDS = new Set([
    "վայրի", "անտառային", "լեռնային", "արևելյան", "արևմտյան",
    "սև", "սպիտակ", "կարմիր", "դեղին", "կանաչ",
    "մեծ", "փոքր", "երկար", "կարճ", "հասարակ", "իսկական",
    "բժշկական", "հայկական", "պարսկական", "կովկասյան",
    "ամառային", "ձմեռային", "գարնանային", "աշնանային",
    "ջրային", "ճահճային", "դաշտային", "քարքարոտ",
  ]);

  
  private readonly STEMMED_SYNONYMS: Map<string, string[]>;

  private readonly NORMALIZATION_MAP: Record<string, string> = {
      // ═══════════════════════════════════════
  // ԳԼԽԱՑԱՎ ԵՎ ՆԵՅՐՈԼՈԳԻԱ
  // ═══════════════════════════════════════
  "գլխացավի":        "գլխացավ",
  "գլխացավից":       "գլխացավ",
  "գլխացավով":       "գլխացավ",
  "գլխացավը":        "գլխացավ",
  "գլխացավին":       "գլխացավ",
  "միգրենի":         "միգրեն",
  "միգրենից":        "միգրեն",
  "միգրենով":        "միգրեն",
  "գլխապտույտի":     "գլխապտույտ",
  "գլխապտույտից":    "գլխապտույտ",
  "գլխի":            "գլուխ",

  // ═══════════════════════════════════════
  // ՍՏԱՄՈՔՍ ԵՎ ՄԱՐՍՈՂՈՒԹՅՈՒՆ
  // ═══════════════════════════════════════
  "ստամոքսի":        "ստամոքս",
  "ստամոքսում":      "ստամոքս",
  "ստամոքսից":       "ստամոքս",
  "ստամոքսով":       "ստամոքս",
  "ստամոքսը":        "ստամոքս",
  "գաստրիտի":        "գաստրիտ",
  "գաստրիտից":       "գաստրիտ",
  "մարսողության":    "մարսողություն",
  "մարսողությունից": "մարսողություն",
  "մարսողությամբ":   "մարսողություն",
  "փորացավի":        "փորացավ",
  "փորացավից":       "փորացավ",
  "թթվայնության":    "թթվայնություն",
  "թթվայնությունից": "թթվայնություն",
  "դիսպեպսիայի":     "դիսպեպսիա",

  // ═══════════════════════════════════════
  // ՍԻՐՏ ԵՎ ՇՐՋԱՆԱՌՈՒԹՅՈՒՆ
  // ═══════════════════════════════════════
  "սրտի":            "սիրտ",
  "սրտով":           "սիրտ",
  "սրտում":          "սիրտ",
  "սրտից":           "սիրտ",
  "սրտային":         "սիրտ",
  "արյունաճնշման":   "արյունաճնշում",
  "արյունաճնշումից": "արյունաճնշում",
  "հիպերտոնիայի":    "հիպերտոնիա",
  "հիպերտոնիայից":   "հիպերտոնիա",
  "սրտխփոցի":        "սրտխփոց",
  "անեմիայի":        "անեմիա",
  "անեմիայից":       "անեմիա",
  "արյան":           "արյուն",
  "արյունային":      "արյուն",
  "արյունից":        "արյուն",

  // ═══════════════════════════════════════
  // ՀԱԶ, ՇՆՉԱՌՈՒԹՅՈՒՆ ԵՎ ԹՈՔԵՐ
  // ═══════════════════════════════════════
  "հազի":            "հազ",
  "հազից":           "հազ",
  "հազով":           "հազ",
  "բրոնխիտի":        "բրոնխիտ",
  "բրոնխիտից":       "բրոնխիտ",
  "ասթմայի":         "ասթմա",
  "ասթմայից":        "ասթմա",
  "թոքախտի":         "թոքախտ",
  "թոքախտից":        "թոքախտ",
  "շնչառության":     "շնչառություն",
  "թոքաբորբի":       "թոքաբորբ",
  "թոքաբորբից":      "թոքաբորբ",

  // ═══════════════════════════════════════
  // ՄՐՍԱԾՈՒԹՅՈՒՆ ԵՎ ՎԱՐԱԿՆԵՐ
  // ═══════════════════════════════════════
  "մրսածության":     "մրսածություն",
  "մրսածությունից":  "մրսածություն",
  "հարբուխի":        "հարբուխ",
  "հարբուխից":       "հարբուխ",
  "գրիպի":           "գրիպ",
  "գրիպից":          "գրիպ",
  "ջերմության":      "ջերմություն",
  "ջերմությունից":   "ջերմություն",
  "տենդի":           "տենդ",
  "տենդից":          "տենդ",
  "վարակի":          "վարակ",
  "վարակից":         "վարակ",
  "վարակով":         "վարակ",
  "ինֆեկցիայի":      "ինֆեկցիա",
  "բորբոքման":       "բորբոքում",
  "բորբոքումից":     "բորբոքում",
  "բորբոքմամբ":      "բորբոքում",

  // ═══════════════════════════════════════
  // ՆՅԱՐԴԱՅԻՆ ՀԱՄԱԿԱՐԳ
  // ═══════════════════════════════════════
  "նյարդի":          "նյարդ",
  "նյարդերի":        "նյարդ",
  "նյարդային":       "նյարդ",
  "նյարդերից":       "նյարդ",
  "սթրեսի":          "սթրես",
  "սթրեսից":         "սթրես",
  "անքնության":      "անքնություն",
  "անքնությունից":   "անքնություն",
  "դեպրեսիայի":      "դեպրեսիա",
  "դեպրեսիայից":     "դեպրեսիա",
  "անհանգստության":  "անհանգստություն",
  "լարվածության":    "լարվածություն",
  "լարվածությունից": "լարվածություն",
  "տագնապի":         "տագնապ",
  "տագնապից":        "տագնապ",

  // ═══════════════════════════════════════
  // ԱՏԱՄ ԵՎ ԲԵՐԱՆ
  // ═══════════════════════════════════════
  "ատամի":           "ատամ",
  "ատամից":          "ատամ",
  "ատամնացավի":      "ատամնացավ",
  "ատամնացավից":     "ատամնացավ",
  "լնդերի":          "լնդեր",
  "լնդերից":         "լնդեր",

  // ═══════════════════════════════════════
  // ՓՈՐ ԵՎ ԱՂԻՆԵՐ
  // ═══════════════════════════════════════
  "փորի":            "փոր",
  "փորից":           "փոր",
  "փորկապության":    "փորկապություն",
  "փորկապությունից": "փորկապություն",
  "լուծի":           "լուծ",
  "լուծից":          "լուծ",
  "դիարեայի":        "դիարեա",
  "դիարեայից":       "դիարեա",
  "կոլիտի":          "կոլիտ",
  "կոլիտից":         "կոլիտ",

  // ═══════════════════════════════════════
  // ԼՅԱՐԴ ԵՎ ԼԵՂԱՊԱՐԿ
  // ═══════════════════════════════════════
  "լյարդի":          "լյարդ",
  "լյարդից":         "լյարդ",
  "լյարդային":       "լյարդ",
  "լեղապարկի":       "լեղապարկ",
  "լեղապարկից":      "լեղապարկ",
  "դեղնուկի":        "դեղնուկ",
  "հեպատիտի":        "հեպատիտ",
  "հեպատիտից":       "հեպատիտ",

  // ═══════════════════════════════════════
  // ԵՐԻԿԱՄՆԵՐ ԵՎ ՄԻԶՈՒՂԻՆԵՐ
  // ═══════════════════════════════════════
  "երիկամի":         "երիկամ",
  "երիկամների":      "երիկամ",
  "երիկամից":        "երիկամ",
  "երիկամային":      "երիկամ",
  "ցիստիտի":         "ցիստիտ",
  "ցիստիտից":        "ցիստիտ",
  "միզուղիների":     "միզուղիներ",

  // ═══════════════════════════════════════
  // ՌԵՒՄԱՏԻԶՄ, ՀՈԴԵՐ ԵՎ ՈՍԿՈՐՆԵՐ
  // ═══════════════════════════════════════
  "ռևմատիզմի":       "ռևմատիզմ",
  "ռևմատիզմից":      "ռևմատիզմ",
  "արթրիտի":         "արթրիտ",
  "արթրիտից":        "արթրիտ",
  "հոդերի":          "հոդ",
  "հոդերից":         "հոդ",
  "հոդաբորբի":       "հոդաբորբ",
  "մեջքի":           "մեջք",
  "մեջքից":          "մեջք",
  "ողնաշարի":        "ողնաշար",
  "ողնաշարից":       "ողնաշար",
  "ցավի":            "ցավ",
  "ցավից":           "ցավ",
  "ցավով":           "ցավ",

  // ═══════════════════════════════════════
  // ՄԱՇԿ
  // ═══════════════════════════════════════
  "մաշկի":           "մաշկ",
  "մաշկից":          "մաշկ",
  "մաշկային":        "մաշկ",
  "էկզեմայի":        "էկզեմա",
  "էկզեմայից":       "էկզեմա",
  "դերմատիտի":       "դերմատիտ",
  "դերմատիտից":      "դերմատիտ",
  "վերքի":           "վերք",
  "վերքից":          "վերք",
  "վերքով":          "վերք",
  "այրվածքի":        "այրվածք",
  "այրվածքից":       "այրվածք",
  "ֆուրունկուլի":     "ֆուրունկուլ",
  "պսորիազիսի":      "պսորիազիս",

  // ═══════════════════════════════════════
  // ԿԱՆԱՑԻ ՀԱՄԱԿԱՐԳ
  // ═══════════════════════════════════════
  "դաշտանի":         "դաշտան",
  "դաշտանից":        "դաշտան",
  "կլիմաքսի":        "կլիմաքս",
  "հղիության":       "հղիություն",
  "հղիությունից":    "հղիություն",

  // ═══════════════════════════════════════
  // ԱՐՅՈՒՆ ԵՎ ԱՆՈԹՆԵՐ
  // ═══════════════════════════════════════
  "արյունահոսության": "արյունահոսություն",
  "վարիկոզի":         "վարիկոզ",
  "վարիկոզից":        "վարիկոզ",
  "հեմորոյի":         "հեմորոյ",
  "հեմորոյից":        "հեմորոյ",

  // ═══════════════════════════════════════
  // ԿՈԿՈՐԴ ԵՎ ՔԹ
  // ═══════════════════════════════════════
  "կոկորդի":         "կոկորդ",
  "կոկորդից":        "կոկորդ",
  "կոկորդով":        "կոկորդ",
  "լարինգիտի":       "լարինգիտ",
  "ֆարինգիտի":       "ֆարինգիտ",
  "քթի":             "քիթ",
  "քթից":            "քիթ",
  "հնձքի":           "հնձք",
  "հնձքից":          "հնձք",

  // ═══════════════════════════════════════
  // ԱՅԼ ԸՆԴՀԱՆՈՒՐ
  // ═══════════════════════════════════════
  "շաքարախտի":       "շաքարախտ",
  "շաքարախտից":      "շաքարախտ",
  "դիաբետի":         "դիաբետ",
  "հոգնածության":    "հոգնածություն",
  "հոգնածությունից": "հոգնածություն",
  "թուլության":      "թուլություն",
  "թուլությունից":   "թուլություն",
  "քաշի":            "քաշ",
  "ախորժակի":        "ախորժակ",
  "ախորժակից":       "ախորժակ",
  "թունավորման":     "թունավորում",
  "թունավորումից":   "թունավորում",
  "ուռուցքի":        "ուռուցք",
  "ուռուցքից":       "ուռուցք",
  "քաղցկեղի":        "քաղցկեղ",
  "քաղցկեղից":       "քաղցկեղ",

  // ═══════════════════════════════════════
  // ԲԱՅԱԿԱՆ ՁԵՎԵՐ — բուժ / օգտագործ / կիրառ
  // ═══════════════════════════════════════
  "բուժել":          "բուժ",
  "բուժելու":        "բուժ",
  "բուժում":         "բուժ",
  "բուժման":         "բուժ",
  "բուժիչ":          "բուժ",
  "բուժվել":         "բուժ",
  "բուժվում":        "բուժ",
  "օգտագործել":      "օգտագործ",
  "օգտագործելու":    "օգտագործ",
  "օգտագործման":     "օգտագործ",
  "օգտագործում":     "օգտագործ",
  "կիրառել":         "կիրառ",
  "կիրառելու":       "կիրառ",
  "կիրառման":        "կիրառ",
  "կիրառում":        "կիրառ",
  "պատրաստել":       "պատրաստ",
  "պատրաստելու":     "պատրաստ",
  "պատրաստման":      "պատրաստ",
  "պատրաստում":      "պատրաստ",
  "խմել":            "խմ",
  "խմելու":          "խմ",
  "ընդունել":        "ընդունել",
  "ընդունելու":      "ընդունել"

  };

  constructor() {
    //Pre-compute stemmed SYNONYMS map մեկ անգամ constructor-ում
    this.STEMMED_SYNONYMS = new Map();
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      const stemmedKey = this.stem(key);
      const stemmedSyns = synonyms.flatMap((s) =>
        this.normalize(s, true).split(/\s+/).filter((w) => w.length > 1)
      );
      // Եթե նույն stemmed key-ն արդեն կա — merge անել
      const existing = this.STEMMED_SYNONYMS.get(stemmedKey);
      if (existing) {
        this.STEMMED_SYNONYMS.set(stemmedKey, [
          ...new Set([...existing, ...stemmedSyns]),
        ]);
      } else {
        this.STEMMED_SYNONYMS.set(stemmedKey, stemmedSyns);
      }
    }
    console.log(
      `✅ SearchEngine: ${this.STEMMED_SYNONYMS.size} stemmed synonym keys pre-computed`
    );
  }

  async loadEmbeddings() {
    if (this.loaded) return;
    const res = await fetch("/herbs_embeddings.json");
    if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
    this.herbs = await res.json();
    this.loaded = true;
    console.log(`✅ Բեռնված է ${this.herbs!.length} դեղաբույս`);
  }

  private stem(word: string): string {
    if (this.NORMALIZATION_MAP[word]) return this.NORMALIZATION_MAP[word];
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

  private normalize(text: string, applyStemming = true): string {
    const cleaned = text
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!applyStemming) return cleaned;
    return cleaned.split(/\s+/).map((w) => this.stem(w)).join(" ");
  }

  private getCacheKey(queryText: string, topK: number): string {
    return `${this.normalize(queryText)}-${topK}`;
  }

  private getFromCache(key: string): SearchResult[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY)
      return cached.results;
    if (cached) this.cache.delete(key);
    return null;
  }

  //ամենահին timestamp-ով entry-ն ջնջել
  private saveToCache(key: string, results: SearchResult[]): void {
    this.cache.set(key, { results, timestamp: Date.now() });

    if (this.cache.size > this.CACHE_MAX_SIZE) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey  = k;
        }
      }

      if (oldestKey !== null) {
        this.cache.delete(oldestKey);
      }
    }
  }

  private detectIntent(query: string): QueryIntent {
    return detectIntent(query, this.herbs ?? undefined);
  }

  private expandQuery(query: string): {
    original: string[];
    expanded: string[];
  } {
    const qNorm = this.normalize(query);
    const originalWords = qNorm.split(/\s+/).filter((w) => w.length > 1);
    const expandedSet = new Set<string>();

    for (const word of originalWords) {
      const directSyns = this.STEMMED_SYNONYMS.get(word);
      if (directSyns) {
        directSyns.forEach((s) => expandedSet.add(s));
      }

      // Reverse lookup — word-ը synonym-ն է, key-ն ենք փնտրում
      // Map-ի values-ը iterate ենք անում, ոչ թե Object.entries + stem
      for (const [stemmedKey, syns] of this.STEMMED_SYNONYMS.entries()) {
        if (syns.includes(word) && stemmedKey !== word) {
          expandedSet.add(stemmedKey);
          syns.forEach((s) => expandedSet.add(s));
        }
      }
    }

    originalWords.forEach((w) => expandedSet.delete(w));
    return { original: originalWords, expanded: Array.from(expandedSet) };
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length, n = str2.length;
    if (Math.abs(m - n) > 4) return 999;
    const matrix = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) =>
        i === 0 ? j : j === 0 ? i : 0
      )
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[m][n];
  }

  private getNameMatchScore(
    query: string,
    herb: Herb
  ): { score: number; type: "exact" | "fuzzy" | null } {
    const qNorm = this.normalize(query, false);
    const qStem = this.normalize(query, true);
    const allNames = [herb.name, ...herb.alternativeNames];
    const allNamesNorm = allNames.map((n) => this.normalize(n, false));
    const allNamesStem = allNames.map((n) => this.normalize(n, true));

    if (allNamesStem.some((n) => n === qStem))
      return { score: 1.0, type: "exact" };

    if (allNamesNorm.some((n) => n === qNorm))
      return { score: 1.0, type: "exact" };

    if (allNamesStem.some((n) => n.length >= 2 && qStem.includes(n)))
      return { score: 0.98, type: "exact" };

    if (allNamesNorm.some((n) => n.length >= 2 && qNorm.includes(n)))
      return { score: 0.97, type: "exact" };

    const qWordsStem = qStem.split(/\s+/).filter((w) => w.length >= 4);
    const qWordsNorm = qNorm.split(/\s+/).filter((w) => w.length >= 4);

    const mainNameStem = this.normalize(herb.name, true);
    const mainNameNorm = this.normalize(herb.name, false);

    for (const qWord of qWordsStem) {
      if (mainNameStem.includes(qWord))
        return { score: 0.95, type: "fuzzy" };
    }
    for (const qWord of qWordsNorm) {
      if (mainNameNorm.includes(qWord))
        return { score: 0.93, type: "fuzzy" };
    }

    for (const altName of herb.alternativeNames) {
      const altNorm = this.normalize(altName, false);
      const altStem = this.normalize(altName, true);
      const altWords = altStem.split(/\s+/).filter(w => w.length >= 3);

      if (altWords.length === 1) {
        if (this.QUALIFIER_WORDS.has(altWords[0])) continue;

        for (const qWord of qWordsStem) {
          if (altStem.includes(qWord) || qWord.includes(altStem))
            return { score: 0.90, type: "fuzzy" };
        }
        for (const qWord of qWordsNorm) {
          if (altNorm.includes(qWord) || qWord.includes(altNorm))
            return { score: 0.88, type: "fuzzy" };
        }
      } else {
        const significantAltWords = altWords.filter(
          w => !this.QUALIFIER_WORDS.has(w)
        );

        if (significantAltWords.length === 0) continue;

        const matchCount = significantAltWords.filter(aw =>
          qWordsStem.some(qw => qw.includes(aw) || aw.includes(qw))
        ).length;

        const matchRatio = matchCount / significantAltWords.length;

        if (matchRatio >= 0.75) {
          const qualifierWords = altWords.filter(w => this.QUALIFIER_WORDS.has(w));
          const qualifierMatch = qualifierWords.length === 0 ||
            qualifierWords.some(qw => qNorm.includes(qw));

          if (qualifierMatch) {
            return { score: 0.90, type: "fuzzy" };
          } else {
            return { score: 0.70, type: "fuzzy" };
          }
        }
      }
    }

    for (const herbName of allNamesNorm) {
      for (const nameWord of herbName.split(/\s+/).filter((w) => w.length >= 4)) {
        if (this.QUALIFIER_WORDS.has(nameWord)) continue;
        if (qNorm.includes(nameWord))
          return { score: 0.88, type: "fuzzy" };
      }
    }

    return { score: 0, type: null };
  }

  private fieldLexicalScore(query: string, fieldText: string): number {
    const { original, expanded } = this.expandQuery(query);
    const fieldNorm = this.normalize(fieldText, true);
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

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private hybridScore(
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

  async search(
    queryEmbedding: number[],
    queryText: string,
    topK = 5
  ): Promise<SearchResult[]> {
    if (!this.loaded || !this.herbs) await this.loadEmbeddings();

    const cacheKey = this.getCacheKey(queryText, topK);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const intent = this.detectIntent(queryText);
    const semanticScores = this.herbs!.map((h) =>
      this.cosineSimilarity(queryEmbedding, h.embedding)
    );
    const minS = Math.min(...semanticScores);
    const maxS = Math.max(...semanticScores);
    const range = maxS - minS || 1;

    const ABSOLUTE_THRESHOLD: Record<QueryIntent, number> = {
      HERB_NAME:  0.20,
      SYMPTOM:    0.22,
      USAGE:      0.22,
      GENERAL:    0.25,
      COMPARISON: 0.22,
      HERB_INFO:  0.22,
    };

    const results = this.herbs!
      .map((herb, idx) => {
        const rawS = semanticScores[idx];
        const normS = (rawS - minS) / range;

        const nameMatch = this.getNameMatchScore(queryText, herb);
        const hasNameMatch = nameMatch.score > 0;
        if (!hasNameMatch && rawS < ABSOLUTE_THRESHOLD[intent]) return null;

        const weights = FIELD_WEIGHTS[intent] ?? FIELD_WEIGHTS.GENERAL;
        const nameS  = this.fieldLexicalScore(queryText, herb.name);
        const altS   = herb.alternativeNames.length > 0
          ? this.fieldLexicalScore(queryText, herb.alternativeNames.join(" "))
          : 0;
        const sympS  = herb.symptoms.length > 0
          ? this.fieldLexicalScore(queryText, herb.symptoms.join(" "))
          : 0;
        const healS  = this.fieldLexicalScore(queryText, herb.healing);
        const usageS = herb.usage
          ? this.fieldLexicalScore(queryText, herb.usage)
          : 0;

        const lexScore =
          nameS  * (weights.name             ?? 0) +
          altS   * (weights.alternativeNames ?? 0) +
          sympS  * (weights.symptoms         ?? 0) +
          healS  * (weights.healing          ?? 0) +
          usageS * (weights.usage            ?? 0.1);
        
        const finalScore = this.hybridScore(normS, lexScore, nameMatch.score, intent);

        const finalThreshold = hasNameMatch ? 0.10 : 0.18;
        if (finalScore < finalThreshold) return null;

        return {
          ...herb,
          semanticScore: normS,
          lexScore,
          finalScore,
          intent,
          matchType: nameMatch.type || "semantic",
          scoreBreakdown: {
            nameScore:    nameS,
            symptomScore: sympS,
            healingScore: healS,
            semanticRaw:  rawS,
            semanticNorm: normS,
            lexical:      lexScore,
            final:        finalScore,
          },
        } as SearchResult;
      })
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    const deduped = this.deduplicateResults(results);
    const result = deduped.slice(0, topK);
    this.saveToCache(cacheKey, result);
    return result;
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  async findSuggestions(query: string, maxSuggestions = 3): Promise<string[]> {
    if (!this.herbs) return [];
    const qNorm = this.normalize(query, false);
    if (qNorm.length < 2) return [];

    const candidates: { name: string; distance: number }[] = [];

    for (const herb of this.herbs) {
      const d = this.levenshteinDistance(qNorm, this.normalize(herb.name, false));
      if (d <= (qNorm.length <= 4 ? 1 : 2)) {
        candidates.push({ name: herb.name, distance: d });
        continue;
      }
      for (const alt of herb.alternativeNames) {
        const dAlt = this.levenshteinDistance(qNorm, this.normalize(alt, false));
        if (dAlt <= (qNorm.length <= 4 ? 1 : 2)) {
          candidates.push({ name: herb.name, distance: dAlt });
          break;
        }
      }
    }

    return candidates
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxSuggestions)
      .map((c) => c.name);
  }
}

export const searchEngine = new HerbSearchEngine();