// src/ragEngine.ts

import { SearchResult } from "./searchEngine";
import { detectIntent } from "./intentDetector";

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  confidence: "high" | "medium" | "low";
}

interface EnrichedResult extends SearchResult {
  usage?: string;
  description?: string;
  chemistry?: string;
}


const RAG_API_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/rag`;

export class RAGEngine {

  shouldTriggerRAG(query: string, results: SearchResult[]): boolean {
    if (results.length === 0) return false;
    const topScore = results[0].finalScore ?? 0;
    const qType = detectIntent(query);

    if (qType === "HERB_INFO"  && topScore >= 0.35) return true;
    if (qType === "SYMPTOM"    && topScore >= 0.25) return true;
    if (qType === "USAGE"      && topScore >= 0.28) return true;
    if (qType === "COMPARISON" && topScore >= 0.30) return true;
    if (qType === "GENERAL"    && topScore >= 0.40) return true;

    return false;
  }

  // primaryHerb — optional parameter
  // entity="herb" դեպքում HerbSearch.tsx-ը փոխանցում է
  // symptom/general դեպքում undefined — AI-ն ազատ է
  async generateAnswer(
    query: string,
    results: SearchResult[],
    primaryHerb?: string
  ): Promise<RAGResponse> {
    const topScore = results[0]?.finalScore ?? 0;
    const confidence = this.getConfidence(topScore);

    try {
      const response = await fetch(RAG_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          context: results.slice(0, 3),
          // primary_herb — undefined հաll է symptom/general query-ի ժամանակ
          primary_herb: primaryHerb ?? null,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) throw new Error("RAG API request failed");

      const data = await response.json();
      return { answer: data.answer, sources: results.slice(0, 3), confidence };
    } catch (error) {
      console.warn("⚠️ AI RAG failed, using local fallback:", error);
      return this.buildAnswer(query, results as EnrichedResult[]);
    }
  }

  private getConfidence(topScore: number): "high" | "medium" | "low" {
    if (topScore >= 0.75) return "high";
    if (topScore >= 0.45) return "medium";
    return "low";
  }

  private buildAnswer(query: string, results: EnrichedResult[]): RAGResponse {
    if (results.length === 0) {
      return { answer: "Ձեր հարցման համար դեղաբույս չգտնվեց։", sources: [], confidence: "low" };
    }

    const top = results[0];
    const qType = detectIntent(query);
    let answer = "";

    switch (qType) {
      case "USAGE":      answer = this.buildUsageAnswer(top, results);          break;
      case "SYMPTOM":    answer = this.buildSymptomAnswer(query, top, results);  break;
      case "COMPARISON": answer = this.buildComparisonAnswer(results);           break;
      case "HERB_INFO":  answer = this.buildHerbInfoAnswer(top);                 break;
      default:           answer = this.buildGeneralAnswer(top, results);
    }

    return {
      answer,
      sources: results.slice(0, 3),
      confidence: this.getConfidence(top.finalScore ?? 0),
    };
  }

  private buildUsageAnswer(top: EnrichedResult, _results: EnrichedResult[]): string {
    const lines = [`**${top.name}** — Օգտագործման եղանակ\n`];
    if (top.usage && top.usage.length > 30) lines.push(top.usage);
    else if (top.healing) lines.push(top.healing);
    return lines.join("\n");
  }

  private buildSymptomAnswer(query: string, top: EnrichedResult, _results: EnrichedResult[]): string {
    const matched = this.extractMatchingSymptoms(query, top);
    let ans = `**${top.name}**\n`;
    if (matched.length > 0) ans += `Հատկապես օգտակար է **${matched.join(", ")}** դեպքում։\n`;
    ans += top.healing ?? "";
    return ans;
  }

  private buildComparisonAnswer(results: EnrichedResult[]): string {
    const strong = results.filter((r) => (r.finalScore ?? 0) >= 0.38);
    if (strong.length < 2) return this.buildHerbInfoAnswer(results[0]);
    const [a, b] = strong;
    return `**Համեմատություն՝ ${a.name} vs ${b.name}**\n\n**${a.name}**: ${a.symptoms.slice(0, 3).join(", ")}\n**${b.name}**: ${b.symptoms.slice(0, 3).join(", ")}`;
  }

  private buildHerbInfoAnswer(herb: EnrichedResult): string {
    return `**${herb.name}**\n\n${herb.description ?? herb.healing ?? ""}`;
  }

  private buildGeneralAnswer(top: EnrichedResult, _results: EnrichedResult[]): string {
    return `**${top.name}** — ${top.healing?.slice(0, 300)}...`;
  }

  private extractMatchingSymptoms(query: string, herb: EnrichedResult): string[] {
    const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return herb.symptoms
      .filter((s) => qWords.some((w) => s.toLowerCase().includes(w)))
      .slice(0, 3);
  }
}