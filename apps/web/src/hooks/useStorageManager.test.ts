import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Hoist mock fns so vi.mock factory can reference them ─────────────────────

const { mockGetStats, mockClearLocalStorage } = vi.hoisted(() => ({
  mockGetStats: vi.fn(),
  mockClearLocalStorage: vi.fn(),
}));

// ─── Mock @/services/StorageManager BEFORE hook import ────────────────────────

vi.mock('@/services/StorageManager', () => ({
  webStorageManager: {
    getStats: mockGetStats,
    clearLocalStorage: mockClearLocalStorage,
  },
}));

// ─── Import hook AFTER mocks ───────────────────────────────────────────────────

import { useStorageManager } from './useStorageManager';
import type { WebStorageStats } from '@/services/StorageManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60 * 1000;

function makeStats(overrides: Partial<WebStorageStats> = {}): WebStorageStats {
  return {
    browserQuotaBytes: 1_000_000,
    browserUsedBytes: 200_000,
    eduSphereQuotaBytes: 500_000,
    eduSphereUsedBytes: 200_000,
    usageRatio: 0.4,
    isApproachingLimit: false,
    isOverLimit: false,
    canGoOffline: true,
    isUnsupported: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useStorageManager', () => {
  beforeEach(() => {
    mockGetStats.mockResolvedValue(makeStats());
    mockClearLocalStorage.mockReturnValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('starts with isLoading=true and stats=null before first resolve', () => {
    // Use a never-resolving promise so we capture the initial synchronous state.
    mockGetStats.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useStorageManager());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();
  });

  it('shows stats and isLoading=false after mount resolves', async () => {
    const stats = makeStats({ usageRatio: 0.25 });
    mockGetStats.mockResolvedValue(stats);

    const { result } = renderHook(() => useStorageManager());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(stats);
  });

  it('refresh() fetches new stats and updates state', async () => {
    const initial = makeStats({ usageRatio: 0.1 });
    const updated = makeStats({ usageRatio: 0.9 });
    mockGetStats.mockResolvedValueOnce(initial).mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useStorageManager());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.stats?.usageRatio).toBe(0.9);
  });

  it('clearLocalStorage calls the service method', async () => {
    mockClearLocalStorage.mockReturnValue(4096);
    mockGetStats.mockResolvedValue(makeStats());

    const { result } = renderHook(() => useStorageManager());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    await act(async () => { result.current.clearLocalStorage(); });

    expect(mockClearLocalStorage).toHaveBeenCalledTimes(1);
  });

  it('clearLocalStorage returns the number of bytes freed from the service', async () => {
    mockClearLocalStorage.mockReturnValue(8192);
    const { result } = renderHook(() => useStorageManager());
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    let freed = 0;
    await act(async () => { freed = result.current.clearLocalStorage(); });

    expect(freed).toBe(8192);
  });

  it('sets up a setInterval on mount', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    mockGetStats.mockResolvedValue(makeStats());

    renderHook(() => useStorageManager());
    await waitFor(() => {
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        POLL_INTERVAL_MS,
      );
    });
  });

  it('clears the interval on unmount (memory safety)', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    mockGetStats.mockResolvedValue(makeStats());

    const { unmount } = renderHook(() => useStorageManager());
    await waitFor(() => { expect(mockGetStats).toHaveBeenCalled(); });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('mounted guard prevents setState after unmount', async () => {
    // Deferred promise: resolves after unmount
    let resolveStats!: (v: WebStorageStats) => void;
    const deferred = new Promise<WebStorageStats>((res) => { resolveStats = res; });
    mockGetStats.mockReturnValue(deferred);

    const { result, unmount } = renderHook(() => useStorageManager());

    // Unmount before the promise resolves
    unmount();

    // Resolve after unmount — mountedRef.current is false, setState is blocked
    await act(async () => {
      resolveStats(makeStats());
      // Drain microtask queue
      await Promise.resolve();
    });

    // stats must still be null — the guard blocked the update
    expect(result.current.stats).toBeNull();
  });
});
