/**
 * Tests for SyncEngine — verifies memory-safety, retry logic, conflict routing, and dispose.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (using vi.hoisted so variables are available inside vi.mock factory) ─
const { mockAddConflict, mockDequeue, mockPeek, mockQueueSize } = vi.hoisted(() => ({
  mockAddConflict: vi.fn(),
  mockDequeue: vi.fn(),
  mockPeek: vi.fn().mockReturnValue([]),
  mockQueueSize: vi.fn().mockReturnValue(0),
}));

vi.mock('expo-network', () => ({
  getNetworkStateAsync: vi.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

vi.mock('../OfflineQueue', () => ({
  enqueue: vi.fn(),
  dequeue: mockDequeue,
  peek: mockPeek,
  incrementRetry: vi.fn(),
  queueSize: mockQueueSize,
  clearAll: vi.fn(),
  addConflict: mockAddConflict,
}));

import { SyncEngine } from '../SyncEngine';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockPeek.mockReturnValue([]);
  mockQueueSize.mockReturnValue(0);
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

  it('status listener receives no events when queue is empty', () => {
    const engine = new SyncEngine('http://localhost:4000/graphql', async () => null);
    const listener = vi.fn();
    engine.addStatusListener(listener);
    engine.start();
    engine.dispose();
    vi.advanceTimersByTime(60_000);
    // peek returns [] and queueSize = 0, so _trySyncAll exits early without emitting
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it('addStatusListener returns unsubscribe function', () => {
    const engine = new SyncEngine('http://localhost:4000/graphql', async () => null);
    const listener = vi.fn();
    const unsub = engine.addStatusListener(listener);
    unsub();
    engine.dispose();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('SyncEngine — offline behaviour', () => {
  it('does not fetch when offline', async () => {
    vi.useRealTimers(); // use real timers for async test
    const { getNetworkStateAsync } = await import('expo-network');
    (getNetworkStateAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    mockQueueSize.mockReturnValue(1); // pretend there's something in the queue

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const engine = new SyncEngine('http://localhost:4000/graphql', async () => 'token');
    engine.start();
    // flush microtasks from immediate _trySyncAll call
    await new Promise((resolve) => setTimeout(resolve, 10));
    engine.dispose();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('SyncEngine — conflict routing (MAX_RETRIES exceeded)', () => {
  it('calls addConflict when a mutation exhausts its retries', async () => {
    vi.useRealTimers(); // use real timers for async test
    const { getNetworkStateAsync } = await import('expo-network');
    (getNetworkStateAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });

    const exhaustedMutation = {
      id: 'mut-x',
      operationName: 'AddAnnotation',
      query: '{ addAnnotation }',
      variables: {},
      tenantId: 't1',
      userId: 'u1',
      createdAt: Date.now(),
      retryCount: 2, // +1 on fail → 3 = MAX_RETRIES
    };

    mockPeek.mockReturnValue([exhaustedMutation]);
    mockQueueSize.mockReturnValue(1);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'));

    const engine = new SyncEngine('http://localhost:4000/graphql', async () => 'token');
    engine.start();
    // flush the immediate _trySyncAll() call
    await new Promise((resolve) => setTimeout(resolve, 50));
    engine.dispose();

    expect(mockAddConflict).toHaveBeenCalledWith(exhaustedMutation, 'max_retries_exceeded');
    expect(mockDequeue).toHaveBeenCalledWith(exhaustedMutation.id);
  });
});
