import { FIELD_WEIGHTS } from "./searchConfig";
import { detectIntent, QueryIntent } from "./intentDetector";
import { distance } from "fastest-levenshtein";
import {
  Herb,
  normalize,
  getNameMatchScore,
  fieldLexicalScore,
  cosineSimilarity,
  hybridScore,
} from "./searchScoring";

export type { Herb };
export type { QueryIntent };

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
  private readonly cache = new Map<string, { results: SearchResult[]; timestamp: number }>();
  private readonly CACHE_EXPIRY = 5 * 60 * 1000;
  private readonly CACHE_MAX_SIZE = 100;

  async loadEmbeddings(): Promise<void> {
    if (this.loaded) return;
    const res = await fetch("/herbs_embeddings.json");
    if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
    this.herbs = await res.json();
    this.loaded = true;
    console.log(`✅ Բեռնված է ${this.herbs!.length} դեղաբույս`);
  }

  private getCacheKey(queryText: string, topK: number): string {
    return `${normalize(queryText)}-${topK}`;
  }

  private getFromCache(key: string): SearchResult[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
      return cached.results;
    }
    if (cached) this.cache.delete(key);
    return null;
  }

  private saveToCache(key: string, results: SearchResult[]): void {
    this.cache.set(key, { results, timestamp: Date.now() });
    if (this.cache.size > this.CACHE_MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
  }

  private detectIntent(query: string): QueryIntent {
    return detectIntent(query, this.herbs ?? undefined);
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
    const semanticScores = this.herbs!.map((h) => cosineSimilarity(queryEmbedding, h.embedding));

    const minAcceptable = 0.12;
    const maxExpected = 0.45;

    const ABSOLUTE_THRESHOLD: Record<QueryIntent, number> = {
      HERB_NAME:  0.15,
      SYMPTOM:    0.16,
      USAGE:      0.16,
      GENERAL:    0.18,
      COMPARISON: 0.16,
      HERB_INFO:  0.16,
    };

    const results = this.herbs!.map((herb, idx) => {
        const rawS = semanticScores[idx];
        let normS = (rawS - minAcceptable) / (maxExpected - minAcceptable);
        normS = Math.max(0, Math.min(1, normS));

        const nameMatch = getNameMatchScore(queryText, herb);
        const hasNameMatch = nameMatch.score > 0;

        if (!hasNameMatch && rawS < ABSOLUTE_THRESHOLD[intent]) return null;

        const weights = FIELD_WEIGHTS[intent] ?? FIELD_WEIGHTS.GENERAL;
        const nameS  = fieldLexicalScore(queryText, herb.name);
        const altS   = herb.alternativeNames.length > 0 ? fieldLexicalScore(queryText, herb.alternativeNames.join(" ")) : 0;
        const sympS  = herb.symptoms.length > 0 ? fieldLexicalScore(queryText, herb.symptoms.join(" ")) : 0;
        const healS  = fieldLexicalScore(queryText, herb.healing);
        const usageS = herb.usage ? fieldLexicalScore(queryText, herb.usage) : 0;

        const lexical =
          nameS  * (weights.name             ?? 0) +
          altS   * (weights.alternativeNames ?? 0) +
          sympS  * (weights.symptoms         ?? 0) +
          healS  * (weights.healing          ?? 0) +
          usageS * (weights.usage            ?? 0.1);

        const finalScore = hybridScore(normS, lexical, nameMatch.score, intent);
        const finalThreshold = hasNameMatch ? 0.08 : 0.14;
        if (finalScore < finalThreshold) return null;

        return {
          ...herb,
          semanticScore: normS,
          lexScore: lexical,
          finalScore,
          intent,
          matchType: nameMatch.type || "semantic",
          scoreBreakdown: {
            nameScore: nameS,
            symptomScore: sympS,
            healingScore: healS,
            semanticRaw: rawS,
            semanticNorm: normS,
            lexical,
            final: finalScore,
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
    const qNorm = normalize(query, false);
    if (qNorm.length < 2) return [];

    const candidates: { name: string; distance: number }[] = [];

    for (const herb of this.herbs) {
      let maxAllowed = 0;
      if (qNorm.length >= 4 && qNorm.length <= 6) maxAllowed = 1;
      if (qNorm.length > 6) maxAllowed = 2;

      const d = distance(qNorm, normalize(herb.name, false));
      if (d <= maxAllowed) {
        candidates.push({ name: herb.name, distance: d });
        continue;
      }

      for (const alt of herb.alternativeNames) {
        const dAlt = distance(qNorm, normalize(alt, false));
        if (dAlt <= maxAllowed) {
          candidates.push({ name: herb.name, distance: dAlt });
          break;
        }
      }
    }

    const uniqueResults = Array.from(new Map(candidates.map((c) => [c.name, c])).values());

    return uniqueResults
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxSuggestions)
      .map((c) => c.name);
  }
}

export const searchEngine = new HerbSearchEngine();