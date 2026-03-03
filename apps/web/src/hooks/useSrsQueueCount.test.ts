import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSrsQueueCount } from './useSrsQueueCount';

// ─── Mock urql ────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
vi.mock('urql', () => ({
  // gql is required because srs.queries.ts uses it at module level
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: (args: unknown) => mockUseQuery(args),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSrsQueueCount', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: false }]);
  });

  // ── Concurrent-mode safety (React 19 mounted defer) ───────────────────────

  it('passes pause=true to useQuery before mount (concurrent-mode safety)', () => {
    // On first render (before useEffect fires) the mounted flag is false,
    // so pause must be true regardless of the external pause argument.
    renderHook(() => useSrsQueueCount());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ pause: true })
    );
  });

  it('passes pause=false to useQuery after mount when not externally paused', async () => {
    renderHook(() => useSrsQueueCount());
    // Flush useEffect so setMounted(true) runs
    await act(async () => {});
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ pause: false })
    );
  });

  it('keeps pause=true even after mount when explicitly paused', async () => {
    renderHook(() => useSrsQueueCount(true));
    await act(async () => {});
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ pause: true })
    );
  });

  // ── Return values ─────────────────────────────────────────────────────────

  it('returns 0 before mount (paused state has no data)', () => {
    // On first render the query is paused; data is undefined → returns 0
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: false }]);
    const { result } = renderHook(() => useSrsQueueCount());
    expect(result.current).toBe(0);
  });

  it('returns the srsQueueCount from data after mount', async () => {
    mockUseQuery.mockReturnValue([
      { data: { srsQueueCount: 7 }, fetching: false },
    ]);
    const { result } = renderHook(() => useSrsQueueCount());
    await act(async () => {});
    expect(result.current).toBe(7);
  });

  it('returns 0 on error (graceful degradation)', async () => {
    mockUseQuery.mockReturnValue([
      { data: undefined, error: new Error('Network error'), fetching: false },
    ]);
    const { result } = renderHook(() => useSrsQueueCount());
    await act(async () => {});
    expect(result.current).toBe(0);
  });

  // ── Error logging ─────────────────────────────────────────────────────────

  it('logs error to console when GraphQL error occurs', () => {
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockUseQuery.mockReturnValue([
      {
        data: undefined,
        error: new Error('GraphQL fetch failed'),
        fetching: false,
      },
    ]);
    renderHook(() => useSrsQueueCount());
    expect(consoleSpy).toHaveBeenCalledWith(
      '[useSrsQueueCount] GraphQL error:',
      'GraphQL fetch failed'
    );
    consoleSpy.mockRestore();
  });

  // ── Request policy ────────────────────────────────────────────────────────

  it('uses network-only request policy', async () => {
    renderHook(() => useSrsQueueCount());
    await act(async () => {});
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ requestPolicy: 'network-only' })
    );
  });
});
