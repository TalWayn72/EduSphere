/**
 * useStorageManager — React hook that polls device storage stats every 5 minutes.
 *
 * Memory-safe: polling interval is cleared on unmount.
 * Exposes clearQueryCache / clearDownloads so SettingsScreen can trigger cleanup.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { storageManager, type StorageStats } from '../services/StorageManager';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface UseStorageManagerReturn {
  stats: StorageStats | null;
  isLoading: boolean;
  /** Reload stats on demand (e.g. after a download completes). */
  refresh: () => Promise<void>;
  clearQueryCache: () => Promise<number>;
  clearDownloads: () => Promise<number>;
}

export function useStorageManager(): UseStorageManagerReturn {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (): Promise<void> => {
    const next = await storageManager.getStats();
    if (mountedRef.current) {
      setStats(next);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    intervalRef.current = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh]);

  const clearQueryCache = useCallback(async (): Promise<number> => {
    const freed = await storageManager.clearQueryCache();
    await refresh();
    return freed;
  }, [refresh]);

  const clearDownloads = useCallback(async (): Promise<number> => {
    const freed = await storageManager.clearDownloads();
    await refresh();
    return freed;
  }, [refresh]);

  return { stats, isLoading, refresh, clearQueryCache, clearDownloads };
}
