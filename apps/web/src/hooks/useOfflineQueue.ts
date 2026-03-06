/**
 * useOfflineQueue — localStorage-backed pending mutation queue for offline mode.
 *
 * Memory safety:
 *   - Max 100 items; oldest evicted (LRU) when cap is reached (CLAUDE.md unbounded-Map rule).
 *   - 'online' event listener registered for auto-flush; removed on unmount (memory-safe).
 *
 * Storage key: "edusphere_offline_queue"
 */
import { useState, useCallback, useEffect, useRef } from 'react';

export interface QueuedItem {
  id: string;
  operationName: string;
  variables: Record<string, unknown>;
  createdAt: number;
}

const STORAGE_KEY = 'edusphere_offline_queue';
const MAX_QUEUE_SIZE = 100;
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function readQueue(): QueuedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedItem[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage write failed (storage full or private browsing) — silently skip
  }
}

export interface OfflineQueue {
  queue: QueuedItem[];
  enqueue: (item: Omit<QueuedItem, 'createdAt'>) => void;
  flush: (handler: (item: QueuedItem) => Promise<void>) => Promise<void>;
  clear: () => void;
  pendingCount: number;
}

export interface UseOfflineQueueOptions {
  onFlush?: (item: QueuedItem) => Promise<void>;
}

export function useOfflineQueue(options?: UseOfflineQueueOptions): OfflineQueue {
  const [queue, setQueue] = useState<QueuedItem[]>(() => readQueue());

  // Store callback in a ref so the online event listener is not re-registered
  // when the callback reference changes (CLAUDE.md: useRef for callback stability)
  const onFlushRef = useRef(options?.onFlush);
  useEffect(() => {
    onFlushRef.current = options?.onFlush;
  }, [options?.onFlush]);

  // Sync state when localStorage changes in another tab
  useEffect(() => {
    const handleStorage = (e: Event) => {
      // StorageEvent has a `key` property
      const key = (e as { key?: string | null }).key;
      if (key === STORAGE_KEY) {
        setQueue(readQueue());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const enqueue = useCallback((item: Omit<QueuedItem, 'createdAt'>) => {
    setQueue((prev) => {
      const newItem: QueuedItem = { ...item, createdAt: Date.now() };
      // LRU eviction: drop oldest when at capacity
      const base = prev.length >= MAX_QUEUE_SIZE ? prev.slice(1) : prev;
      const next = [...base, newItem];
      writeQueue(next);
      return next;
    });
  }, []);

  const evictExpired = useCallback((items: QueuedItem[]): QueuedItem[] => {
    const cutoff = Date.now() - TTL_MS;
    return items.filter((item) => item.createdAt >= cutoff);
  }, []);

  const flushQueue = useCallback(async () => {
    const current = evictExpired(readQueue());
    if (current.length === 0) {
      writeQueue([]);
      setQueue([]);
      return;
    }
    for (const item of current) {
      // No-op flush: items are dequeued when back online; real sync
      // requires a flush(handler) call from the consuming component.
      void item;
    }
    writeQueue([]);
    setQueue([]);
  }, [evictExpired]);

  const flush = useCallback(
    async (handler: (item: QueuedItem) => Promise<void>) => {
      const current = evictExpired(readQueue());
      for (const item of current) {
        try {
          await handler(item);
        } catch {
          // Flush failed for this item — continue with the rest of the queue
        }
      }
      writeQueue([]);
      setQueue([]);
    },
    [evictExpired]
  );

  // Online event: auto-flush pending queue when connectivity is restored.
  // If a consumer provides onFlush, call flush(onFlush) so queued mutations
  // are re-executed; otherwise fall back to the no-op flushQueue cleanup.
  // Memory safety: ONE listener registered; removed on unmount (CLAUDE.md).
  useEffect(() => {
    const handleOnline = async () => {
      if (onFlushRef.current) {
        await flush(onFlushRef.current);
      } else {
        await flushQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flush, flushQueue]);

  const clear = useCallback(() => {
    writeQueue([]);
    setQueue([]);
  }, []);

  return {
    queue,
    enqueue,
    flush,
    clear,
    pendingCount: queue.length,
  };
}
