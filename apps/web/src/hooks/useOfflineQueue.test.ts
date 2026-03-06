/**
 * useOfflineQueue — unit tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineQueue } from './useOfflineQueue';

const STORAGE_KEY = 'edusphere_offline_queue';
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

describe('useOfflineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty queue when no persisted data', () => {
    const { result } = renderHook(() => useOfflineQueue());
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
  });

  it('enqueue adds item to queue', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({
        id: 'item-1',
        operationName: 'CreateAnnotation',
        variables: { text: 'hello' },
      });
    });

    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].operationName).toBe('CreateAnnotation');
    expect(result.current.pendingCount).toBe(1);
  });

  it('enqueue sets createdAt timestamp', () => {
    const before = Date.now();
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({
        id: 'item-1',
        operationName: 'CreateAnnotation',
        variables: {},
      });
    });

    const after = Date.now();
    expect(result.current.queue[0].createdAt).toBeGreaterThanOrEqual(before);
    expect(result.current.queue[0].createdAt).toBeLessThanOrEqual(after);
  });

  it('enqueue persists to localStorage', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({
        id: 'item-1',
        operationName: 'CreateAnnotation',
        variables: {},
      });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
    expect(stored).toHaveLength(1);
  });

  it('queue is capped at 100 items — evicts oldest (LRU)', () => {
    const { result } = renderHook(() => useOfflineQueue());

    // Add 101 items
    act(() => {
      for (let i = 0; i < 101; i++) {
        result.current.enqueue({
          id: `item-${i}`,
          operationName: `Op${i}`,
          variables: {},
        });
      }
    });

    // Should be capped at 100
    expect(result.current.queue).toHaveLength(100);
    // Oldest item (item-0) should have been evicted
    const ids = result.current.queue.map((q) => q.id);
    expect(ids).not.toContain('item-0');
    // Most recent item should be present
    expect(ids).toContain('item-100');
  });

  it('flush calls handler for each item and clears queue', async () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({ id: 'a', operationName: 'OpA', variables: {} });
      result.current.enqueue({ id: 'b', operationName: 'OpB', variables: {} });
    });

    const handler = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.flush(handler);
    });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  it('flush continues processing even if one item fails', async () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({ id: 'a', operationName: 'OpA', variables: {} });
      result.current.enqueue({ id: 'b', operationName: 'OpB', variables: {} });
    });

    const handler = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.flush(handler);
    });

    // Both items were attempted
    expect(handler).toHaveBeenCalledTimes(2);
    // Queue is cleared regardless
    expect(result.current.pendingCount).toBe(0);
  });

  it('clear empties the queue', () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({ id: 'x', operationName: 'OpX', variables: {} });
    });
    expect(result.current.pendingCount).toBe(1);

    act(() => {
      result.current.clear();
    });

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.queue).toHaveLength(0);
  });

  // ─── TTL eviction ──────────────────────────────────────────────────────────
  it('flush evicts items older than 48 hours (TTL)', async () => {
    const { result } = renderHook(() => useOfflineQueue());

    // Manually write an expired item directly to localStorage
    const expiredItem = {
      id: 'old-item',
      operationName: 'OldOp',
      variables: {},
      createdAt: Date.now() - (TTL_MS + 1000), // 1 second past TTL
    };
    const freshItem = {
      id: 'fresh-item',
      operationName: 'FreshOp',
      variables: {},
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([expiredItem, freshItem]));

    const handler = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.flush(handler);
    });

    // Only the fresh item should have been processed (expired item is evicted)
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'fresh-item' }));
    expect(handler).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'old-item' }));
  });

  // ─── online event auto-flush ───────────────────────────────────────────────
  it('registers online event listener on mount and removes it on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOfflineQueue());

    // Should have registered 'online' listener
    const onlineAdded = addSpy.mock.calls.some(([event]) => event === 'online');
    expect(onlineAdded).toBe(true);

    unmount();

    // Should have removed 'online' listener on unmount
    const onlineRemoved = removeSpy.mock.calls.some(([event]) => event === 'online');
    expect(onlineRemoved).toBe(true);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('online event triggers flushQueue and clears the queue', async () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({ id: 'sync-item', operationName: 'SyncOp', variables: {} });
    });
    expect(result.current.pendingCount).toBe(1);

    // Fire the online event
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      // Allow microtasks to flush
      await Promise.resolve();
    });

    expect(result.current.queue).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
  });

  // ─── Phase 28: TTL eviction on enqueue path ────────────────────────────────
  it('evicts items older than 48 hours on enqueue — stale item not flushed', async () => {
    // Pre-populate localStorage with an item that is 49 hours old
    const staleItem = {
      id: 'stale-id',
      operationName: 'StaleOp',
      variables: {},
      createdAt: Date.now() - (TTL_MS + 60 * 60 * 1000), // 49 hours ago
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([staleItem]));

    const { result } = renderHook(() => useOfflineQueue());

    // Enqueue a new fresh item
    act(() => {
      result.current.enqueue({ id: 'new-id', operationName: 'NewOp', variables: {} });
    });

    // Now flush with a handler — TTL eviction happens inside flush
    const handler = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      await result.current.flush(handler);
    });

    // Handler is called ONLY for the fresh item; stale item is evicted by TTL
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-id' }));
    expect(handler).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'stale-id' }));
    // Queue is cleared
    expect(result.current.pendingCount).toBe(0);
  });

  // ─── Phase 28: online event flushes queue ─────────────────────────────────
  it('flushes queue when online event fires', async () => {
    const { result } = renderHook(() => useOfflineQueue());

    act(() => {
      result.current.enqueue({ id: 'item-online', operationName: 'OnlineOp', variables: {} });
    });
    expect(result.current.pendingCount).toBe(1);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    // Auto-flush (no external handler) empties the queue
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });

  // ─── Phase 28: memory safety — online listener removed on unmount ──────────
  it('removes online event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOfflineQueue());

    const onlineRegistered = addSpy.mock.calls.some(([event]) => event === 'online');
    expect(onlineRegistered).toBe(true);

    unmount();

    const onlineRemoved = removeSpy.mock.calls.some(([event]) => event === 'online');
    expect(onlineRemoved).toBe(true);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
