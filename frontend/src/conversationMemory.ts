// src/conversationMemory.ts

import { SearchResult } from "./searchEngine";

interface ConversationTurn {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

const STORAGE_KEY       = "herb_conversation_history";
const AUTO_CLEANUP_KEY  = "herb_conv_last_cleanup";
const CLEANUP_INTERVAL  = 24 * 60 * 60 * 1000;

export class ConversationMemory {
  private history: ConversationTurn[] = [];
  private maxHistory     = 5;
  private sessionTimeout = 30 * 60 * 1000;

  constructor() {
    this.autoCleanupIfNeeded();
    this.loadFromStorage();
  }

  addTurn(query: string, results: SearchResult[]) {
    this.cleanupExpiredTurns();
    this.history.push({ query, results, timestamp: Date.now() });
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

  isFollowUpQuery(query: string): boolean {
    if (this.history.length === 0) return false;
    const followUpPatterns = [
      /^(իսկ|ու|և)\s+/i,
      /^ինչպես\s+(պատրաստ|օգտագործ|կիրառ)/i,
      /^(այն|սա|դա)\s+/i,
      /^(պատրաստել|օգտագործել|կիրառել)/i,
      /^(ավելի|շատ|քիչ|լավ)\s+/i,
    ];
    return followUpPatterns.some((p) => p.test(query.trim()));
  }

// Փոխանցում ենք ամբողջական բույսերի օբյեկտները
resolveFollowUp(query: string, herbs: any[] = []): string {
  const lastHerb = this.getLastMentionedHerb();
  if (!lastHerb) return query;

  // ✅ Ստուգում ենք բոլոր հնարավոր տարբերակները (name, altNames, id)
  const isNewHerbMentioned = herbs.some(h => {
    const q = query.toLowerCase();
    const nameMatch = q.includes(h.name.toLowerCase());
    const idMatch   = q.includes(h.id.toString().toLowerCase());
    const altMatch  = h.alternativeNames?.some((alt: string) => 
      q.includes(alt.toLowerCase())
    );
    return nameMatch || idMatch || altMatch;
  });

  // Եթե նոր բույս կա հարցման մեջ, հինը ՄԻ՛ ավելացրու
  if (isNewHerbMentioned) {
    return query;
  }
  
  // ✅ ՆՈՐ — Եթե query-ն ուղղակի բույսի անուն է պարունակում
  // և USAGE intent ունի — հինը ՄԻ՛ ավելացրու
  const USAGE_PATTERNS = [
    /ինչպես/i, /օգտագործ/i, /պատրաստ/i, /խմել/i, /կիրառ/i, /բուժ/i
  ];
  const hasUsageIntent = USAGE_PATTERNS.some(p => p.test(query));
  if (hasUsageIntent) return query;
  if (this.isFollowUpQuery(query)) {
    const cleanQuery = query
      .trim()
      .replace(/^(իսկ|ու|և|այն|սա|դա)\s+/i, "")
      .replace(/^(ավելի|շատ|քիչ|լավ)\s+/i, "")
      .replace(/^(պատրաստել|օգտագործել|կիրառել)\s*/i, "$1 ")
      .trim();

    
    return cleanQuery ? `${lastHerb.name} ${cleanQuery}`.trim() : lastHerb.name;
  }
  return query;
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