import { SearchResult } from "./searchEngine";
import {
  autoCleanupIfNeeded,
  loadFreshFromStorage,
  saveWithQuotaHandling,
} from "./utils/localStorageTTLCache";

interface ClickData {
  query: string;
  herbId: string;
  clicks: number;
  lastClicked: number;
}

type ClickEntry = [string, ClickData];

const RERANKER_STORAGE_KEY = "herb_click_data";
const AUTO_CLEANUP_KEY     = "herb_reranker_last_cleanup";
const CLEANUP_INTERVAL     = 24 * 60 * 60 * 1000;
const MAX_STORAGE_ENTRIES  = 200;

export class ResultReranker {
  private clickData: Map<string, ClickData>;
  private maxAge          = 7 * 24 * 60 * 60 * 1000;
  private lastCleanup     = 0;
  private cleanupInterval = 5 * 60 * 1000;

  constructor() {
    this.clickData = new Map();
    setTimeout(() => {
      autoCleanupIfNeeded<ClickEntry>(
        RERANKER_STORAGE_KEY,
        AUTO_CLEANUP_KEY,
        CLEANUP_INTERVAL,
        this.maxAge,
        ([, data]) => data.lastClicked,
        "ResultReranker"
      );

      const freshEntries = loadFreshFromStorage<ClickEntry>(
        RERANKER_STORAGE_KEY,
        this.maxAge,
        ([, data]) => data.lastClicked
      );
      for (const [key, data] of freshEntries) {
        this.clickData.set(key, data);
      }
      console.log(`✅ ResultReranker: ${this.clickData.size} click records loaded`);
    }, 0);
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

    const daysSinceLastClick = (Date.now() - data.lastClicked) / (1000 * 60 * 60 * 24);
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

  private saveToStorage(): void {
    let entries: ClickEntry[] = Array.from(this.clickData.entries());

    if (entries.length > MAX_STORAGE_ENTRIES) {
      entries.sort(([, a], [, b]) => b.lastClicked - a.lastClicked);
      entries = entries.slice(0, MAX_STORAGE_ENTRIES);
      this.clickData.clear();
      for (const [key, data] of entries) this.clickData.set(key, data);
      console.warn(`⚠️ ResultReranker: LRU eviction — թողնվել է ${MAX_STORAGE_ENTRIES} entry`);
    }

    saveWithQuotaHandling<ClickEntry>(
      RERANKER_STORAGE_KEY,
      entries,
      (current) => {
        const sorted = [...current].sort(([, a], [, b]) => b.lastClicked - a.lastClicked);
        const half   = sorted.slice(0, Math.floor(sorted.length / 2));
        this.clickData.clear();
        for (const [key, data] of half) this.clickData.set(key, data);
        return half;
      },
      "ResultReranker"
    );
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
}

export const resultReranker = new ResultReranker();