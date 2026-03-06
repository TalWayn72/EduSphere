/**
 * useOfflineQueue — unit tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineQueue } from './useOfflineQueue';

const STORAGE_KEY = 'edusphere_offline_queue';

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
});
