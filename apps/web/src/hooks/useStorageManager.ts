/**
 * useStorageManager (Web) — React hook that exposes browser storage stats.
 *
 * Polls every 5 minutes. Refreshes immediately on mount.
 * Memory-safe: interval cleared on unmount.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  webStorageManager,
  type WebStorageStats,
} from '@/services/StorageManager';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

interface UseStorageManagerReturn {
  stats: WebStorageStats | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  clearLocalStorage: () => number;
}

export function useStorageManager(): UseStorageManagerReturn {
  const [stats, setStats] = useState<WebStorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (): Promise<void> => {
    const next = await webStorageManager.getStats();
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

  const clearLocalStorage = useCallback((): number => {
    const freed = webStorageManager.clearLocalStorage();
    void refresh();
    return freed;
  }, [refresh]);

  return { stats, isLoading, refresh, clearLocalStorage };
}
