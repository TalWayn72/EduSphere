/**
 * useOfflineAnchors — unit tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineAnchors } from './useOfflineAnchors';
import type { VisualAnchor } from '@/components/visual-anchoring/visual-anchor.types';

// ── vi.hoisted ensures spies are initialised before the vi.mock factory runs ─
const { mockClose, mockPut, mockGet } = vi.hoisted(() => {
  const store: Record<string, unknown> = {};
  const mockClose = vi.fn();
  const mockPut = vi.fn((_storeName: string, record: unknown) => {
    const r = record as { assetId: string };
    store[r.assetId] = record;
    return Promise.resolve();
  });
  const mockGet = vi.fn((_storeName: string, key: string) =>
    Promise.resolve(store[key])
  );
  return { mockClose, mockPut, mockGet, store };
});

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    close: mockClose,
    put: mockPut,
    get: mockGet,
    objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
  }),
}));

vi.mock('./useOfflineStatus', () => ({
  useOfflineStatus: () => ({ isOnline: true, isOffline: false, lastOnlineAt: null }),
}));

// ── constants ─────────────────────────────────────────────────────────────────
const ASSET_ID = 'asset-abc-123';

const SAMPLE_ANCHORS: VisualAnchor[] = [
  {
    id: 'anc-1',
    mediaAssetId: 'media-1',
    anchorText: 'Introduction',
    documentOrder: 0,
    isBroken: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('useOfflineAnchors', () => {
  beforeEach(() => {
    mockClose.mockClear();
    mockPut.mockClear();
    mockGet.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes storeAnchors, loadCachedAnchors, and isOnline', async () => {
    const { result } = renderHook(() => useOfflineAnchors(ASSET_ID));
    await waitFor(() => {
      expect(typeof result.current.storeAnchors).toBe('function');
      expect(typeof result.current.loadCachedAnchors).toBe('function');
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('storeAnchors stores to IndexedDB when available', async () => {
    const { result } = renderHook(() => useOfflineAnchors(ASSET_ID));
    await waitFor(() => expect(typeof result.current.storeAnchors).toBe('function'));

    await act(async () => {
      await result.current.storeAnchors(SAMPLE_ANCHORS);
    });

    expect(mockPut).toHaveBeenCalledWith(
      'anchors',
      expect.objectContaining({ assetId: ASSET_ID, anchors: SAMPLE_ANCHORS })
    );
  });

  it('loadCachedAnchors retrieves stored anchors from IndexedDB', async () => {
    const { result } = renderHook(() => useOfflineAnchors(ASSET_ID));
    await waitFor(() => expect(typeof result.current.storeAnchors).toBe('function'));

    await act(async () => {
      await result.current.storeAnchors(SAMPLE_ANCHORS);
    });

    let loaded: VisualAnchor[] | null = null;
    await act(async () => {
      loaded = await result.current.loadCachedAnchors();
    });

    expect(loaded).toEqual(SAMPLE_ANCHORS);
  });

  it('loadCachedAnchors returns null when nothing stored', async () => {
    const { result } = renderHook(() => useOfflineAnchors('no-such-asset'));
    await waitFor(() => expect(typeof result.current.loadCachedAnchors).toBe('function'));

    let loaded: VisualAnchor[] | null = null;
    await act(async () => {
      loaded = await result.current.loadCachedAnchors();
    });

    expect(loaded).toBeNull();
  });

  it('falls back to localStorage when IndexedDB open fails', async () => {
    const { openDB } = await import('idb');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB unavailable'));

    const { result } = renderHook(() => useOfflineAnchors('fallback-asset'));
    // Give the rejected open time to settle
    await new Promise((r) => setTimeout(r, 50));

    await act(async () => {
      await result.current.storeAnchors(SAMPLE_ANCHORS);
    });

    const raw = localStorage.getItem('edusphere_anchors_fallback-asset');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { anchors: VisualAnchor[] };
    expect(parsed.anchors).toEqual(SAMPLE_ANCHORS);
  });

  it('loadCachedAnchors reads from localStorage when IDB is unavailable', async () => {
    localStorage.setItem(
      `edusphere_anchors_${ASSET_ID}`,
      JSON.stringify({ anchors: SAMPLE_ANCHORS, cachedAt: Date.now() })
    );

    const { openDB } = await import('idb');
    vi.mocked(openDB).mockRejectedValueOnce(new Error('IDB unavailable'));

    const { result } = renderHook(() => useOfflineAnchors(ASSET_ID));
    await new Promise((r) => setTimeout(r, 50));

    let loaded: VisualAnchor[] | null = null;
    await act(async () => {
      loaded = await result.current.loadCachedAnchors();
    });

    expect(loaded).toEqual(SAMPLE_ANCHORS);
  });

  it('DB is closed on unmount', async () => {
    const { unmount } = renderHook(() => useOfflineAnchors(ASSET_ID));

    // Wait for DB to open (mockClose not yet called)
    await waitFor(() => expect(mockClose).not.toHaveBeenCalled());

    unmount();

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
