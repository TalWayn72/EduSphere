/**
 * useVisualAssetSearch — unit tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { VisualAsset } from '@/components/visual-anchoring/visual-anchor.types';

// ── stable urql mock ─────────────────────────────────────────────────────────
// The client object MUST be a stable singleton — a new object on every render
// would cause an infinite loop before the hook's useRef capture was added.
const mockQueryFn = vi.fn();
const stableClient = { query: mockQueryFn };

vi.mock('urql', () => ({
  useClient: () => stableClient,
  gql: (s: TemplateStringsArray) => s.join(''),
}));

vi.mock('@/components/visual-anchoring/visual-anchor.graphql', () => ({
  GET_VISUAL_ASSETS: 'GET_VISUAL_ASSETS_QUERY',
}));

// ── helpers ──────────────────────────────────────────────────────────────────
const makeAsset = (
  overrides: Partial<VisualAsset> & { id: string }
): VisualAsset => ({
  id: overrides.id,
  filename: overrides.filename ?? `file-${overrides.id}.png`,
  mimeType: 'image/png',
  sizeBytes: 1024,
  storageUrl: `https://cdn.example.com/${overrides.id}.png`,
  webpUrl: null,
  scanStatus: overrides.scanStatus ?? 'CLEAN',
  metadata: { altText: overrides.metadata?.altText ?? null },
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const CLEAN_ASSETS: VisualAsset[] = [
  makeAsset({ id: '1', filename: 'photosynthesis.png', metadata: { altText: 'diagram of photosynthesis' } }),
  makeAsset({ id: '2', filename: 'mitosis.png', metadata: { altText: 'cell division diagram' } }),
  makeAsset({ id: '3', filename: 'newton-laws.png', metadata: { altText: null } }),
];

const ALL_ASSETS: VisualAsset[] = [
  ...CLEAN_ASSETS,
  makeAsset({ id: '4', filename: 'malware.exe.png', scanStatus: 'INFECTED' }),
  makeAsset({ id: '5', filename: 'uploading.png', scanStatus: 'PENDING' }),
  makeAsset({ id: '6', filename: 'broken.png', scanStatus: 'ERROR' }),
];

function setupMock(assets: VisualAsset[] = ALL_ASSETS) {
  mockQueryFn.mockReturnValue({
    toPromise: () => Promise.resolve({ data: { getVisualAssets: assets } }),
  });
}

describe('useVisualAssetSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all CLEAN assets when query is empty', async () => {
    setupMock();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    await waitFor(() => expect(result.current.fetching).toBe(false));

    expect(result.current.results).toHaveLength(3);
    expect(result.current.results.every((a) => a.scanStatus === 'CLEAN')).toBe(true);
  });

  it('does NOT include INFECTED assets', async () => {
    setupMock();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    await waitFor(() => expect(result.current.fetching).toBe(false));

    expect(result.current.results.map((a) => a.id)).not.toContain('4');
  });

  it('does NOT include PENDING or ERROR assets', async () => {
    setupMock();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    await waitFor(() => expect(result.current.fetching).toBe(false));

    const ids = result.current.results.map((a) => a.id);
    expect(ids).not.toContain('5');
    expect(ids).not.toContain('6');
  });

  it('filters by filename (case-insensitive)', async () => {
    setupMock();
    vi.useFakeTimers();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    // Resolve the initial asset load while fake timers are active
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleSearch('PHOTO');
      vi.runAllTimers();
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('1');
  });

  it('filters by altText (case-insensitive)', async () => {
    setupMock();
    vi.useFakeTimers();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleSearch('cell division');
      vi.runAllTimers();
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('2');
  });

  it('debounce: rapid calls result in single filter update', async () => {
    setupMock();
    vi.useFakeTimers();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleSearch('p');
      result.current.handleSearch('ph');
      result.current.handleSearch('pho');
      result.current.handleSearch('phot');
      vi.runAllTimers();
    });

    // Only the last debounced value should have been applied
    expect(result.current.query).toBe('phot');
  });

  it('returns all CLEAN assets when query is cleared', async () => {
    setupMock();
    vi.useFakeTimers();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleSearch('mitosis');
      vi.runAllTimers();
    });
    expect(result.current.results).toHaveLength(1);

    act(() => {
      result.current.handleSearch('   ');
      vi.runAllTimers();
    });
    // whitespace-only trims to '' → returns all clean assets
    expect(result.current.results).toHaveLength(3);
  });

  it('returns empty array when no assets match query', async () => {
    setupMock();
    vi.useFakeTimers();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result } = renderHook(() => useVisualAssetSearch('course-123'));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleSearch('xyznotfound');
      vi.runAllTimers();
    });

    expect(result.current.results).toHaveLength(0);
  });

  it('clears debounce timer on unmount (no setState after unmount)', async () => {
    setupMock();
    vi.useFakeTimers();
    const { useVisualAssetSearch } = await import('./useVisualAssetSearch');
    const { result, unmount } = renderHook(() =>
      useVisualAssetSearch('course-123')
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.handleSearch('photo');
    });

    // Unmount before debounce fires — should not throw (no setState after unmount)
    unmount();
    expect(() => vi.runAllTimers()).not.toThrow();
  });
});
