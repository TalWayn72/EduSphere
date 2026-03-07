/**
 * useOfflineAnchors — memory safety tests.
 * Verifies that the IndexedDB connection is closed on unmount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ── useOfflineStatus mock ────────────────────────────────────────────────────
vi.mock('./useOfflineStatus', () => ({
  useOfflineStatus: () => ({ isOnline: true, isOffline: false, lastOnlineAt: null }),
}));

describe('useOfflineAnchors — memory safety', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('closes IndexedDB on unmount', async () => {
    const closeSpy = vi.fn();
    const mockDb = {
      close: closeSpy,
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
    };

    vi.doMock('idb', () => ({
      openDB: vi.fn().mockResolvedValue(mockDb),
    }));

    // Import hook after mock is in place
    const { useOfflineAnchors } = await import('./useOfflineAnchors');

    const { unmount } = renderHook(() => useOfflineAnchors('asset-123'));

    // Wait for DB to open
    await waitFor(() => expect(closeSpy).not.toHaveBeenCalled());

    unmount();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw when IDB open fails and unmount is called', async () => {
    vi.doMock('idb', () => ({
      openDB: vi.fn().mockRejectedValue(new Error('IDB blocked')),
    }));

    const { useOfflineAnchors } = await import('./useOfflineAnchors');

    const { unmount } = renderHook(() => useOfflineAnchors('asset-fallback'));

    // Let the rejection settle
    await new Promise((r) => setTimeout(r, 50));

    // Should not throw on unmount when dbRef is null
    expect(() => unmount()).not.toThrow();
  });

  it('does not re-open DB on assetId change (openDatabase is stable)', async () => {
    const openDBSpy = vi.fn().mockResolvedValue({
      close: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
    });

    vi.doMock('idb', () => ({ openDB: openDBSpy }));

    const { useOfflineAnchors } = await import('./useOfflineAnchors');

    const { rerender } = renderHook(
      ({ id }: { id: string }) => useOfflineAnchors(id),
      { initialProps: { id: 'asset-1' } }
    );

    await waitFor(() => expect(openDBSpy).toHaveBeenCalledTimes(1));

    // Change assetId — openDatabase callback is stable so DB should NOT re-open
    rerender({ id: 'asset-2' });

    // Still only 1 call — the DB was opened once and reused
    expect(openDBSpy).toHaveBeenCalledTimes(1);
  });
});
