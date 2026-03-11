// src/queryRewriter.ts

import { SYNONYMS } from "./searchConfig";

export class QueryRewriter {

  private correctTypos(query: string): string {
    const typoMap: Record<string, string> = {
      // --- ՏԱՌԱՍԽԱԼՆԵՐ (TYPOS) ---
      "օկտագործել":  "օգտագործել",
      "օգտագործու":  "օգտագործում",
      "առողջութուն": "առողջություն",
      "առոխջություն": "առողջություն",
      "դեխատոմս":    "դեղատոմս",
      "հիվանթ":      "հիվանդ",
      "հիվնադ":      "հիվանդ",
      "վիտամն":      "վիտամին",
      "դեխորայք":    "դեղորայք",
      "դեղորայկ":    "դեղորայք",
      "արուն":       "արյուն",
      "գլխացաւ":    "գլխացավ",
      "նիւթ":       "նյութ",
      "արիւն":      "արյուն",
      "թիւ":        "թիվ",
      "բժշկութիւն": "բժշկություն",

      // --- ԼԱՏԻՆԱՏԱՌ (TRANSLIT) ---
      "bjishk":     "բժիշկ",
      "bshishk":    "բժիշկ",
      "dexatom":    "դեղատոմս",
      "deghatom":   "դեղատոմս",
      "hivand":     "հիվանդ",
      "stamoqs":    "ստամոքս",
      "stamoqx":    "ստամոքս",
      "glxacav":    "գլխացավ",
      "aroxjutyun": "առողջություն",
      "aroghjutyun":"առողջություն",
      "dexer":      "դեղեր",
      "degher":     "դեղեր",
      "vax":        "վախ",
      "citramon":   "ցիտրամոն",
      "analgin":    "անալգին",
    };

    const words = query.toLowerCase().split(/(\s+)/);
    const corrected = words.map((token) => {
      if (/^\s+$/.test(token)) return token;
      
      return typoMap[token] ?? token;
    });

    return corrected.join("");
  }

  expandQuery(query: string): string[] {
    const normalized = query.toLowerCase().trim();
    const expansions = new Set<string>([query]);
    const words = normalized.split(/\s+/);

    for (const word of words) {
      if (SYNONYMS[word]) {
        for (const syn of SYNONYMS[word]) {
          const expanded = words.map((w) => (w === word ? syn : w)).join(" ");
          expansions.add(expanded);
        }
      }

      for (const [key, synonyms] of Object.entries(SYNONYMS)) {
        if (synonyms.includes(word)) {
          const expanded = words.map((w) => (w === word ? key : w)).join(" ");
          expansions.add(expanded);
        }
      }
    }

    return Array.from(expansions).slice(0, 5);
  }

  extractEntities(
    query: string,
    herbNames: string[]
  ): { herbs: string[]; symptoms: string[] } {
    const qLower = query.toLowerCase();
    const entities = { herbs: [] as string[], symptoms: [] as string[] };

    for (const herbName of herbNames) {
      if (qLower.includes(herbName.toLowerCase())) {
        entities.herbs.push(herbName);
      }
    }

    for (const symptom of Object.keys(SYNONYMS)) {
      if (qLower.includes(symptom)) {
        entities.symptoms.push(symptom);
      }
    }

    return entities;
  }
  
  rewriteToCanonical(query: string): string {
    let rewritten = this.correctTypos(query.toLowerCase().trim());
    

    // "գլխացավի համար" → "գլխացավ"
    rewritten = rewritten.replace(/([\u0531-\u0587]+)ի?\s+համար/gi, "$1");

    // "վալերիանով բուժել" → "վալերիան բուժում"
    rewritten = rewritten.replace(/([\u0531-\u0587]+)ով\s+բուժել/gi, "$1 բուժում");

    rewritten = rewritten.replace(
      /ինչպես\s+օգտագործել\s+([\u0531-\u0587]+?)([ը ն])?$/gi,
      "$1 օգտագործում"
    );

    // Հեռացնել կրկնվող բառերը (դեդուպլիկացիա)
    const words = rewritten.split(/\s+/).filter(w => w.length > 0);
    return Array.from(new Set(words)).join(" ");
  }

  
  rewrite(
    query: string,
    herbNames: string[] = []
  ): {
    original: string;
    canonical: string;
    expansions: string[];
    entities: { herbs: string[]; symptoms: string[] };
  } {
    const canonical  = this.rewriteToCanonical(query);
    const expansions = this.expandQuery(canonical);
    const entities   = this.extractEntities(query, herbNames);

    return {
      original: query,
      canonical,
      expansions,
      entities,
    };
  }
}

export const queryRewriter = new QueryRewriter();