import { SearchResult } from "./searchEngine";

export interface ConversationTurn {
  query: string;
  results: SearchResult[];
  timestamp: number;
  herbName?: string;   
}

const STORAGE_KEY       = "herb_conversation_history";
const AUTO_CLEANUP_KEY  = "herb_conv_last_cleanup";
const CLEANUP_INTERVAL  = 24 * 60 * 60 * 1000;

export class ConversationMemory {
  private history: ConversationTurn[] = [];
  private maxHistory     = 5;
  private sessionTimeout = 30 * 60 * 1000;

  
  constructor() {
    setTimeout(() => {
      this.autoCleanupIfNeeded();
      this.loadFromStorage();
    }, 0);
  }

  addTurn(query: string, results: SearchResult[], herbName?: string) {
    this.cleanupExpiredTurns();
    this.history.push({ query, results, timestamp: Date.now(), herbName });
    if (this.history.length > this.maxHistory) this.history.shift();
    this.saveToStorage();
  }

  getLastTurn(): ConversationTurn | null {
    this.cleanupExpiredTurns();
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1];
  }

  getLastMentionedHerb(): SearchResult | null {
    const lastTurn = this.getLastTurn();
    if (!lastTurn || lastTurn.results.length === 0) return null;
    return lastTurn.results[0];
  }

 
  private autoCleanupIfNeeded(): void {
    try {
      const lastCleanup = parseInt(
        localStorage.getItem(AUTO_CLEANUP_KEY) ?? "0"
      );
      const now = Date.now();
      if (now - lastCleanup < CLEANUP_INTERVAL) return;

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConversationTurn[];
        const fresh  = parsed.filter(
          (t) => now - t.timestamp < this.sessionTimeout
        );
        if (fresh.length < parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
          console.log(
            `🧹 ConversationMemory: auto-cleanup — հեռացվել է ${parsed.length - fresh.length} հին turn`
          );
        }
      }
      localStorage.setItem(AUTO_CLEANUP_KEY, String(now));
    } catch {
      
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ConversationTurn[];
      const now    = Date.now();
      this.history = parsed.filter(
        (t) => now - t.timestamp < this.sessionTimeout
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.getLightweightHistory())
      );
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        if (this.history.length > 1) {
          this.history.shift();
          console.warn("⚠️ localStorage լցված — ամենահին turn-ը հեռացվեց");
          this.saveToStorage();
        } else {
          localStorage.removeItem(STORAGE_KEY);
          console.warn("⚠️ localStorage լցված — history-ն մաքրվեց");
        }
      }
    }
  }

  private getLightweightHistory() {
    return this.history.map((t) => ({
      query:     t.query,
      timestamp: t.timestamp,
      herbName:  t.herbName,   
      results:   t.results.map((r) => ({
        id:               r.id,
        name:             r.name,
        alternativeNames: r.alternativeNames,
        symptoms:         r.symptoms,
        healing:          r.healing,
        htmlFile:         r.htmlFile,
        finalScore:       r.finalScore,
        matchType:        r.matchType,
        intent:           r.intent,
        embedding:        [] as number[],
      })),
    }));
  }

  private cleanupExpiredTurns() {
    const now    = Date.now();
    this.history = this.history.filter(
      (turn) => now - turn.timestamp < this.sessionTimeout
    );
  }

  clear() {
    this.history = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTO_CLEANUP_KEY);
  }

  getHistory(): ConversationTurn[] {
    this.cleanupExpiredTurns();
    return [...this.history];
  }
}

export const conversationMemory = new ConversationMemory();