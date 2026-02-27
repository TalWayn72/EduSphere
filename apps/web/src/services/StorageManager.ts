/**
 * StorageManager (Web) — tracks EduSphere's browser storage footprint.
 *
 * Quota policy (browser context):
 *   The browser allocates a per-origin quota based on available disk space.
 *   EduSphere self-limits to 50 % of that browser-allocated quota so that
 *   other origins and system processes are not starved.
 *
 *   Thresholds:
 *     • Warn zone  ≥ 80 % of EduSphere's self-limit
 *     • Over-limit ≥ 100 % of EduSphere's self-limit → disable offline mode
 *
 * API: navigator.storage.estimate() — supported in all modern browsers.
 * Falls back gracefully when the Storage API is unavailable.
 */

/** EduSphere uses at most this fraction of the browser-allocated quota. */
export const STORAGE_QUOTA_FRACTION = 0.5;

/** Warn when usage reaches this fraction of EduSphere's self-limit. */
export const STORAGE_WARN_FRACTION = 0.8;

export interface WebStorageStats {
  /** Total quota the browser allocated to this origin (bytes). */
  browserQuotaBytes: number;
  /** Current bytes used by this origin (all caches + IndexedDB + localStorage). */
  browserUsedBytes: number;
  /** EduSphere's self-imposed limit = QUOTA_FRACTION × browserQuotaBytes */
  eduSphereQuotaBytes: number;
  /** Same as browserUsedBytes — we track all origin usage as one budget. */
  eduSphereUsedBytes: number;
  /** 0–1 relative to eduSphereQuotaBytes (can exceed 1.0). */
  usageRatio: number;
  isApproachingLimit: boolean;
  isOverLimit: boolean;
  /** false when isOverLimit — offline mode should be disabled. */
  canGoOffline: boolean;
  /** true when navigator.storage API is not available. */
  isUnsupported: boolean;
}

export class WebStorageManager {
  async getStats(): Promise<WebStorageStats> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return this.unsupportedStats();
    }

    const estimate = await navigator.storage.estimate();
    const browserQuotaBytes = estimate.quota ?? 0;
    const browserUsedBytes = estimate.usage ?? 0;

    const eduSphereQuotaBytes = Math.floor(
      browserQuotaBytes * STORAGE_QUOTA_FRACTION
    );
    const usageRatio =
      eduSphereQuotaBytes > 0 ? browserUsedBytes / eduSphereQuotaBytes : 0;

    return {
      browserQuotaBytes,
      browserUsedBytes,
      eduSphereQuotaBytes,
      eduSphereUsedBytes: browserUsedBytes,
      usageRatio,
      isApproachingLimit: usageRatio >= STORAGE_WARN_FRACTION,
      isOverLimit: usageRatio >= 1.0,
      canGoOffline: usageRatio < 1.0,
      isUnsupported: false,
    };
  }

  /** Returns true when `neededBytes` more can be stored within EduSphere quota. */
  async isStorageAvailable(neededBytes: number): Promise<boolean> {
    const stats = await this.getStats();
    if (stats.isUnsupported) return true; // can't measure → allow
    return stats.eduSphereUsedBytes + neededBytes <= stats.eduSphereQuotaBytes;
  }

  /**
   * Clears localStorage keys that belong to EduSphere.
   * Preserves user preference keys (locale, theme) so they survive a cache clear.
   * Returns approximate bytes freed (estimated from string length × 2).
   */
  clearLocalStorage(): number {
    const PRESERVED_KEYS = new Set(['edusphere_locale']);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('edusphere_') && !PRESERVED_KEYS.has(key))
        keysToRemove.push(key);
    }
    const bytesFreed = keysToRemove.reduce((sum, k) => {
      const val = localStorage.getItem(k) ?? '';
      return sum + (k.length + val.length) * 2; // UTF-16
    }, 0);
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    return bytesFreed;
  }

  private unsupportedStats(): WebStorageStats {
    return {
      browserQuotaBytes: 0,
      browserUsedBytes: 0,
      eduSphereQuotaBytes: 0,
      eduSphereUsedBytes: 0,
      usageRatio: 0,
      isApproachingLimit: false,
      isOverLimit: false,
      canGoOffline: true,
      isUnsupported: true,
    };
  }
}

export const webStorageManager = new WebStorageManager();
