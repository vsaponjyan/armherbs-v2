// src/herbEntityResolver.ts

import { ARMENIAN_SUFFIXES } from "./searchConfig";

interface HerbInfo {
  id: string;
  name: string;
  alternativeNames: string[];
  symptoms?: string[];
}

export interface ResolvedEntity {
  type: "herb" | "symptom" | "none";
  herbName?: string;
  herbId?: string;
  symptom?: string;
  resolvedQuery: string;
}

export class HerbEntityResolver {
  private herbs: HerbInfo[] = [];
  private symptomIndex = new Map<string, string>();

  // ══════════════════════════════════════════════════════════════
  // Qualifier բառեր — միայնակ (isolated) token-ի նման ՉեՆ ճանաչվում
  // Միայն full phrase context-ում են ընդունելի
  // ══════════════════════════════════════════════════════════════
  private readonly QUALIFIER_WORDS = new Set([
    "վայրի", "անտառային", "լեռնային", "արևելյան", "արևմտյան",
    "սև", "սպիտակ", "կարմիր", "դեղին", "կանաչ",
    "մեծ", "փոքր", "երկար", "կարճ", "հասարակ", "իսկական",
    "բժշկական", "հայկական", "պարսկական", "կովկասյան",
    "ամառային", "ձմեռային", "գարնանային", "աշնանային",
    "ջրային", "ճահճային", "դաշտային", "քարքարոտ",
  ]);

  private stem(word: string): string {
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

  private normalizeWord(word: string): string {
    return word.toLowerCase().replace(/[^\p{L}]/gu, "").trim();
  }

  private stemWord(word: string): string {
    return this.stem(this.normalizeWord(word));
  }

  private stemPhrase(phrase: string): string {
    return phrase
      .toLowerCase()
      .split(/\s+/)
      .map((w) => this.stemWord(w))
      .join(" ");
  }

  setHerbs(herbs: HerbInfo[]) {
    this.herbs = herbs;
    this.symptomIndex.clear();
    for (const herb of herbs) {
      for (const s of herb.symptoms ?? []) {
        const canonical = s.toLowerCase().trim();
        const stemmed = this.stemPhrase(canonical);
        if (!this.symptomIndex.has(stemmed)) {
          this.symptomIndex.set(stemmed, canonical);
        }
      }
    }
    console.log(`✅ Symptom index built: ${this.symptomIndex.size} unique symptoms`);
  }

  // ══════════════════════════════════════════════════════════════
  // Helper — ստուգել արդյոք needle բառերը ՀԱՐԱԿԻՑ են haystack-ում
  // ══════════════════════════════════════════════════════════════
  private hasConsecutiveWords(haystack: string[], needle: string[]): boolean {
    if (needle.length === 0 || needle.length > haystack.length) return false;
    for (let i = 0; i <= haystack.length - needle.length; i++) {
      let match = true;
      for (let j = 0; j < needle.length; j++) {
        if (haystack[i + j] !== needle[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  
  resolve(query: string, keepContext = true): ResolvedEntity {
    if (!query.trim() || this.herbs.length === 0) {
      return { type: "none", resolvedQuery: query };
    }

    const qLower = query.toLowerCase().trim();
    const qStemmed = this.stemPhrase(qLower);
    const qStemmedWords = qStemmed.split(/\s+/);

    // ✅ Հավաքում ենք բոլոր գտնված բույսերը մեկ զանգվածում
    const matches: Array<{ herb: HerbInfo; index: number; matchLength: number }> = [];

    // 1. Phrase-level match 
    for (const herb of this.herbs) {
      const allNames = [herb.name, ...herb.alternativeNames];
      for (const name of allNames) {
        const nameLower = name.toLowerCase().trim();
        const nameStemmed = this.stemPhrase(nameLower);
        const nameStemmedWords = nameStemmed.split(/\s+/).filter(w => w.length >= 2);

        // Ստուգում ենք դիրքը հարցման մեջ
        const pos = qLower.indexOf(nameLower);
        const stemPos = qStemmed.indexOf(nameStemmed);

        if (pos !== -1 || stemPos !== -1) {
          matches.push({
            herb,
            index: pos !== -1 ? pos : stemPos,
            matchLength: nameLower.length
          });
        } 
        else if (nameStemmedWords.length > 0 && this.hasConsecutiveWords(qStemmedWords, nameStemmedWords)) {
          const consecutivePos = qStemmedWords.indexOf(nameStemmedWords[0]);
          matches.push({
            herb,
            index: consecutivePos,
            matchLength: nameStemmedWords.length * 5 // Կշիռ ենք տալիս բազմաբառ անուններին
          });
        }
      }
    }

    // 2. Եթե phrase matches չկան, փորձում ենք Word-by-word (բայց էլի հավաքում ենք բոլորը)
    if (matches.length === 0) {
      const qWords = qLower.split(/\s+/).map(w => w.replace(/[^\p{L}]/gu, "")).filter(w => w.length >= 2);
      
      qWords.forEach((qWord, qIdx) => {
        const normalized = this.normalizeWord(qWord);
        if (this.QUALIFIER_WORDS.has(normalized)) return;

        const qStem = this.stemWord(qWord);
        if (qStem.length < 3) return;

        for (const herb of this.herbs) {
          const nameWords = herb.name.toLowerCase().split(/\s+/).map(w => this.stemWord(w));
          const nameMatch = nameWords.some(nw => nw === qStem || (nw.length >= 4 && nw.startsWith(qStem)));
          const idMatch = herb.id.toLowerCase() === qWord.toLowerCase();

          if (nameMatch || idMatch) {
            matches.push({ herb, index: qIdx, matchLength: qWord.length });
          }
        }
      });
    }

    
    if (matches.length > 0) {
      // Longest match wins — ամենաերկար անունով բույսը ամենակոնկրետն է
      // Last position wins — միայն հավասար երկարության դեպքում
      matches.sort((a, b) => b.matchLength - a.matchLength || b.index - a.index);
      const winner = matches[0].herb;
      console.log(`🎯 Entity Resolved: "${winner.name}" (Longest match wins)`);
      return this.buildHerbResult(winner, query, keepContext);
    }

    // 3. Symptom match (եթե բույս չգտնվեց)
    const symptomMatch = this.findSymptomInQuery(query);
    if (symptomMatch) {
      const resolvedQuery = keepContext ? `${symptomMatch} ${query}`.trim() : symptomMatch;
      return { type: "symptom", symptom: symptomMatch, resolvedQuery };
    }

    return { type: "none", resolvedQuery: query };
  }
  private buildHerbResult(
    herb: HerbInfo,
    originalQuery: string,
    keepContext: boolean
  ): ResolvedEntity {
    let resolvedQuery: string;
    if (keepContext) {
      const cleanedQuery = this.removeHerbFromQuery(originalQuery, herb);
      resolvedQuery = cleanedQuery.trim()
        ? `${herb.name} ${cleanedQuery}`.trim()
        : herb.name;
    } else {
      resolvedQuery = herb.name;
    }
    return { type: "herb", herbName: herb.name, herbId: herb.id, resolvedQuery };
  }

  private removeHerbFromQuery(query: string, herb: HerbInfo): string {
    let cleaned = query.toLowerCase();
    const namesToRemove = [
      herb.name.toLowerCase(),
      herb.id.toLowerCase(),
      ...herb.alternativeNames.map((a) => a.toLowerCase()),
    ];
    for (const name of namesToRemove) {
      cleaned = cleaned.replace(name, "");
      const nameStem = this.stemWord(name);
      if (nameStem.length >= 3) {
        const regex = new RegExp(`${nameStem}[\\p{L}]*`, "giu");
        cleaned = cleaned.replace(regex, "");
      }
    }
    return cleaned.replace(/\s+/g, " ").trim();
  }

  private findSymptomInQuery(query: string): string | null {
    const qWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    // Longest match first (3 բառ → 2 → 1)
    for (let len = 3; len >= 1; len--) {
      for (let i = 0; i <= qWords.length - len; i++) {
        const phrase = qWords.slice(i, i + len).join(" ");
        const stemmed = this.stemPhrase(phrase);
        const canonical = this.symptomIndex.get(stemmed);
        if (canonical) return canonical;
        if (this.symptomIndex.has(phrase)) return this.symptomIndex.get(phrase)!;
      }
    }
    return null;
  }
}

export const herbEntityResolver = new HerbEntityResolver();