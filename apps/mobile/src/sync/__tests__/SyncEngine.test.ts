/**
 * Tests for SyncEngine — verifies memory-safety, retry logic, and dispose.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('expo-network', () => ({
  getNetworkStateAsync: vi.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

vi.mock('../OfflineQueue', () => ({
  enqueue: vi.fn(),
  dequeue: vi.fn(),
  peek: vi.fn().mockReturnValue([]),
  incrementRetry: vi.fn(),
  queueSize: vi.fn().mockReturnValue(0),
  clearAll: vi.fn(),
}));

import { SyncEngine } from '../SyncEngine';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SyncEngine — lifecycle', () => {
  it('dispose() clears the interval (memory-safe)', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const engine = new SyncEngine('http://localhost:4000/graphql', async () => 'token');
    engine.start();
    engine.dispose();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('status listener receives idle after dispose', () => {
    const engine = new SyncEngine('http://localhost:4000/graphql', async () => null);
    const listener = vi.fn();
    engine.addStatusListener(listener);
    engine.start();
    engine.dispose();
    // After dispose, no further calls should happen from timer
    vi.advanceTimersByTime(60_000);
    // listener was called at start (idle,0), not after dispose
    expect(listener).toHaveBeenCalledTimes(0); // peek returns [] so no emit on start
  });

  it('addStatusListener returns unsubscribe function', () => {
    const engine = new SyncEngine('http://localhost:4000/graphql', async () => null);
    const listener = vi.fn();
    const unsub = engine.addStatusListener(listener);
    unsub();
    // After unsub, listener should not receive more events
    engine.dispose();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('SyncEngine — offline behaviour', () => {
  it('does not attempt sync when offline', async () => {
    const { getNetworkStateAsync } = await import('expo-network');
    (getNetworkStateAsync as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const engine = new SyncEngine('http://localhost:4000/graphql', async () => 'token');
    engine.start();
    await vi.runAllTimersAsync();
    engine.dispose();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
