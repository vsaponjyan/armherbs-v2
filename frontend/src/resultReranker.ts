// src/resultReranker.ts

import { SearchResult } from "./searchEngine";

interface ClickData {
  query: string;
  herbId: string;
  clicks: number;
  lastClicked: number;
}

const RERANKER_STORAGE_KEY  = "herb_click_data";
const AUTO_CLEANUP_KEY       = "herb_reranker_last_cleanup";
const CLEANUP_INTERVAL       = 24 * 60 * 60 * 1000; // 24 ժամը մեկ
const MAX_STORAGE_ENTRIES    = 200; // Max entry-ների քանակ

export class ResultReranker {
  private clickData: Map<string, ClickData>;
  private maxAge          = 7 * 24 * 60 * 60 * 1000; // 7 օր
  private lastCleanup     = 0;
  private cleanupInterval = 5 * 60 * 1000; // 5 րոպե in-memory throttle

  constructor() {
    this.clickData = new Map();
    this.autoCleanupIfNeeded(); //App բացելիս ստուգել
    this.loadFromStorage();
  }

  recordClick(query: string, herbId: string) {
    const key      = `${query.toLowerCase()}:${herbId}`;
    const existing = this.clickData.get(key);

    if (existing) {
      existing.clicks++;
      existing.lastClicked = Date.now();
    } else {
      this.clickData.set(key, {
        query: query.toLowerCase(),
        herbId,
        clicks: 1,
        lastClicked: Date.now(),
      });
    }

    this.throttledCleanup();
    this.saveToStorage();
  }

  private getClickBoost(query: string, herbId: string): number {
    const key  = `${query.toLowerCase()}:${herbId}`;
    const data = this.clickData.get(key);
    if (!data) return 0;

    const clickBoost = Math.min(0.15, data.clicks * 0.03);

    const daysSinceLastClick =
      (Date.now() - data.lastClicked) / (1000 * 60 * 60 * 24);
    const recencyMultiplier =
      daysSinceLastClick < 1 ? 1.0  :
      daysSinceLastClick < 3 ? 0.75 :
      daysSinceLastClick < 7 ? 0.5  : 0.25;

    return clickBoost * recencyMultiplier;
  }

  rerank(query: string, results: SearchResult[]): SearchResult[] {
    return results
      .map((result) => {
        const clickBoost = this.getClickBoost(query, result.id);
        return {
          ...result,
          finalScore: Math.min(1.0, (result.finalScore ?? 0) + clickBoost),
        };
      })
      .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
  }

  // 24 ժամը մեկ ավտոմատ մաքրում storage-ից
  // Expired (7 օրից հին) entry-ները ջնջվում են
  private autoCleanupIfNeeded(): void {
    try {
      const lastCleanup = parseInt(
        localStorage.getItem(AUTO_CLEANUP_KEY) ?? "0"
      );
      const now = Date.now();
      if (now - lastCleanup < CLEANUP_INTERVAL) return;

      const raw = localStorage.getItem(RERANKER_STORAGE_KEY);
      if (raw) {
        const entries = JSON.parse(raw) as [string, ClickData][];
        const fresh   = entries.filter(
          ([, data]) => now - data.lastClicked <= this.maxAge
        );
        if (fresh.length < entries.length) {
          localStorage.setItem(
            RERANKER_STORAGE_KEY,
            JSON.stringify(fresh)
          );
          console.log(
            `🧹 ResultReranker: auto-cleanup — հեռացվել է ${entries.length - fresh.length} հին entry`
          );
        }
      }
      localStorage.setItem(AUTO_CLEANUP_KEY, String(now));
    } catch {
      
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(RERANKER_STORAGE_KEY);
      if (!raw) return;
      const entries = JSON.parse(raw) as [string, ClickData][];
      const now     = Date.now();
      for (const [key, data] of entries) {
        if (now - data.lastClicked <= this.maxAge) {
          this.clickData.set(key, data);
        }
      }
      console.log(`✅ ResultReranker: ${this.clickData.size} click records loaded`);
    } catch {
      localStorage.removeItem(RERANKER_STORAGE_KEY);
    }
  }

  //LRU — լցվելու դեպքում ամենահին entry-ն հեռացնել
  private saveToStorage(): void {
    try {
      // MAX_STORAGE_ENTRIES-ից ավել entry-ներ կան — LRU eviction
      let entries = Array.from(this.clickData.entries());
      if (entries.length > MAX_STORAGE_ENTRIES) {
        // Sort by lastClicked — ամենահինը վերջում
        entries.sort(([, a], [, b]) => b.lastClicked - a.lastClicked);
        // Կտրել — թողնել միայն MAX_STORAGE_ENTRIES-ն
        entries = entries.slice(0, MAX_STORAGE_ENTRIES);
        // clickData-ն էլ թարմացնել
        this.clickData.clear();
        for (const [key, data] of entries) {
          this.clickData.set(key, data);
        }
        console.warn(
          `⚠️ ResultReranker: LRU eviction — թողնվել է ${MAX_STORAGE_ENTRIES} entry`
        );
      }
      localStorage.setItem(RERANKER_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        // Storage լցված — ամենահին կեսը հեռացնել
        const entries = Array.from(this.clickData.entries()).sort(
          ([, a], [, b]) => b.lastClicked - a.lastClicked
        );
        const half = Math.floor(entries.length / 2);
        const kept = entries.slice(0, half);
        this.clickData.clear();
        for (const [key, data] of kept) {
          this.clickData.set(key, data);
        }
        console.warn(
          `⚠️ localStorage լցված — click data-ի հին կեսը հեռացվեց`
        );
        // Կրկին փորձել
        try {
          localStorage.setItem(
            RERANKER_STORAGE_KEY,
            JSON.stringify(kept)
          );
        } catch {
          localStorage.removeItem(RERANKER_STORAGE_KEY);
        }
      }
    }
  }

  private throttledCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;
    this.lastCleanup = now;
    this.cleanupOldData();
  }

  private cleanupOldData() {
    const now      = Date.now();
    const toDelete: string[] = [];
    this.clickData.forEach((data, key) => {
      if (now - data.lastClicked > this.maxAge) toDelete.push(key);
    });
    toDelete.forEach((key) => this.clickData.delete(key));
    if (toDelete.length > 0) this.saveToStorage();
  }

  clearData() {
    this.clickData.clear();
    localStorage.removeItem(RERANKER_STORAGE_KEY);
    localStorage.removeItem(AUTO_CLEANUP_KEY);
  }
}

export const resultReranker = new ResultReranker();