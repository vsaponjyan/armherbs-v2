/**
 * Ընդհանուր helper-ներ localStorage-ում TTL (time-to-live) սկզբունքով
 * պահվող տվյալների համար։ Օգտագործվում է conversationMemory և
 * resultReranker-ի կողմից՝ ընդհանուր cleanup/load/save pattern-ի համար։
 */

export function autoCleanupIfNeeded<T>(
    storageKey: string,
    autoCleanupKey: string,
    cleanupIntervalMs: number,
    maxAgeMs: number,
    getTimestamp: (item: T) => number,
    logLabel: string
  ): void {
    try {
      const lastCleanup = parseInt(localStorage.getItem(autoCleanupKey) ?? "0");
      const now = Date.now();
      if (now - lastCleanup < cleanupIntervalMs) return;
  
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T[];
        const fresh = parsed.filter((item) => now - getTimestamp(item) <= maxAgeMs);
        if (fresh.length < parsed.length) {
          localStorage.setItem(storageKey, JSON.stringify(fresh));
          console.log(`🧹 ${logLabel}: auto-cleanup — հեռացվել է ${parsed.length - fresh.length} հին entry`);
        }
      }
      localStorage.setItem(autoCleanupKey, String(now));
    } catch {
      // silent — cleanup failure չպիտի խափանի app-ը
    }
  }
  
  export function loadFreshFromStorage<T>(
    storageKey: string,
    maxAgeMs: number,
    getTimestamp: (item: T) => number
  ): T[] {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as T[];
      const now = Date.now();
      return parsed.filter((item) => now - getTimestamp(item) < maxAgeMs);
    } catch {
      localStorage.removeItem(storageKey);
      return [];
    }
  }
  
  export function saveWithQuotaHandling<T>(
    storageKey: string,
    items: T[],
    onQuotaExceeded: (items: T[]) => T[],
    logLabel: string
  ): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        const reduced = onQuotaExceeded(items);
        try {
          localStorage.setItem(storageKey, JSON.stringify(reduced));
          console.warn(`⚠️ ${logLabel}: localStorage լցված — տվյալները կրճատվեցին`);
        } catch {
          localStorage.removeItem(storageKey);
          console.warn(`⚠️ ${logLabel}: localStorage լցված — տվյալները ամբողջությամբ մաքրվեցին`);
        }
      }
    }
  }