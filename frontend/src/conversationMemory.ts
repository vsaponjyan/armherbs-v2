import { SearchResult } from "./searchEngine";
import {
  autoCleanupIfNeeded,
  loadFreshFromStorage,
  saveWithQuotaHandling,
} from "./utils/localStorageTTLCache";

export interface ConversationTurn {
  query: string;
  results: SearchResult[];
  timestamp: number;
  herbName?: string;
}

const STORAGE_KEY      = "herb_conversation_history";
const AUTO_CLEANUP_KEY = "herb_conv_last_cleanup";
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

export class ConversationMemory {
  private history: ConversationTurn[] = [];
  private maxHistory     = 5;
  private sessionTimeout = 30 * 60 * 1000;

  constructor() {
    setTimeout(() => {
      autoCleanupIfNeeded<ConversationTurn>(
        STORAGE_KEY,
        AUTO_CLEANUP_KEY,
        CLEANUP_INTERVAL,
        this.sessionTimeout,
        (t) => t.timestamp,
        "ConversationMemory"
      );
      this.history = loadFreshFromStorage<ConversationTurn>(
        STORAGE_KEY,
        this.sessionTimeout,
        (t) => t.timestamp
      );
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

  private saveToStorage(): void {
    saveWithQuotaHandling<ReturnType<typeof this.getLightweightHistory>[number]>(
      STORAGE_KEY,
      this.getLightweightHistory(),
      () => {
        if (this.history.length > 1) {
          this.history.shift();
        } else {
          this.history = [];
        }
        return this.getLightweightHistory();
      },
      "ConversationMemory"
    );
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

  getHistory(): ConversationTurn[] {
    this.cleanupExpiredTurns();
    return [...this.history];
  }
}

export const conversationMemory = new ConversationMemory();