import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSrsQueueCount } from './useSrsQueueCount';

// ─── Mock urql ────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
vi.mock('urql', () => ({
  // gql is required because srs.queries.ts uses it at module level
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: (args: unknown) => mockUseQuery(args),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSrsQueueCount', () => {
  it('returns 0 when data is undefined', () => {
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: true }]);
    const { result } = renderHook(() => useSrsQueueCount());
    expect(result.current).toBe(0);
  });

  it('returns the srsQueueCount from data', () => {
    mockUseQuery.mockReturnValue([{ data: { srsQueueCount: 7 }, fetching: false }]);
    const { result } = renderHook(() => useSrsQueueCount());
    expect(result.current).toBe(7);
  });

  it('returns 0 on error', () => {
    mockUseQuery.mockReturnValue([{ data: undefined, error: new Error('Network error'), fetching: false }]);
    const { result } = renderHook(() => useSrsQueueCount());
    expect(result.current).toBe(0);
  });

  it('passes pause=true to useQuery when paused', () => {
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: false }]);
    renderHook(() => useSrsQueueCount(true));
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ pause: true }));
  });

  it('passes pause=false to useQuery by default', () => {
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: false }]);
    renderHook(() => useSrsQueueCount());
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ pause: false }));
  });

  it('uses cache-and-network request policy', () => {
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: false }]);
    renderHook(() => useSrsQueueCount());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ requestPolicy: 'cache-and-network' })
    );
  });
});
