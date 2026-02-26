/**
 * Tests for useOfflineAnnotations hook.
 * Verifies memory-safety (SyncEngine disposed on unmount) and addAnnotation enqueues.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';

// ── Mocks ───────────────────────────────────────────────────────────────────
const mockStart = vi.fn();
const mockDispose = vi.fn();
const mockEnqueue = vi.fn();
const mockAddStatusListener = vi.fn(() => () => {});

vi.mock('../sync/SyncEngine', () => ({
  SyncEngine: vi.fn().mockImplementation(() => ({
    start: mockStart,
    dispose: mockDispose,
    addStatusListener: mockAddStatusListener,
    enqueueOfflineMutation: mockEnqueue,
  })),
}));

vi.mock('../sync/OfflineQueue', () => ({
  queueSize: vi.fn().mockReturnValue(0),
  enqueue: vi.fn(),
}));

import { useOfflineAnnotations } from '../useOfflineAnnotations';

const opts = {
  graphqlEndpoint: 'http://localhost:4000/graphql',
  tenantId: 'tenant-a',
  userId: 'user-1',
  getAuthToken: async () => 'tok',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOfflineAnnotations', () => {
  it('starts SyncEngine on mount', () => {
    const { unmount } = renderHook(() => useOfflineAnnotations(opts));
    expect(mockStart).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('disposes SyncEngine on unmount (memory-safe)', () => {
    const { unmount } = renderHook(() => useOfflineAnnotations(opts));
    unmount();
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('addAnnotation enqueues a mutation', () => {
    const { result } = renderHook(() => useOfflineAnnotations(opts));
    act(() => {
      result.current.addAnnotation(
        'asset-1',
        12.5,
        'Test annotation',
        'PERSONAL'
      );
    });
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        operationName: 'AddAnnotation',
        variables: expect.objectContaining({
          assetId: 'asset-1',
          text: 'Test annotation',
        }),
      })
    );
  });

  it('returns pending annotation in localPending', () => {
    const { result } = renderHook(() => useOfflineAnnotations(opts));
    act(() => {
      result.current.addAnnotation('asset-2', 5.0, 'Pending', 'PERSONAL');
    });
    expect(result.current.localPending).toHaveLength(1);
    expect(result.current.localPending[0].syncStatus).toBe('pending');
  });

  it('initial syncStatus is idle', () => {
    const { result } = renderHook(() => useOfflineAnnotations(opts));
    expect(result.current.syncStatus).toBe('idle');
  });
});
