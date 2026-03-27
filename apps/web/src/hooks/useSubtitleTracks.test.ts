/**
 * useSubtitleTracks hook tests
 *
 * Verifies:
 *  1. Returns empty array when no data
 *  2. Returns subtitle tracks from query
 *  3. Returns empty array on error
 *  4. Pauses query when contentId is empty
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

import * as urql from 'urql';
import { useSubtitleTracks } from './useSubtitleTracks';

describe('useSubtitleTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined, stale: false } as never,
      vi.fn(),
    ]);
    const { result } = renderHook(() => useSubtitleTracks('content-1'));
    expect(result.current).toEqual([]);
  });

  it('returns subtitle tracks from query data', () => {
    const tracks = [
      { language: 'en', label: 'English', src: '/subs/en.vtt' },
      { language: 'he', label: 'Hebrew', src: '/subs/he.vtt' },
    ];
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          contentItem: {
            mediaAsset: { subtitleTracks: tracks },
          },
        },
        fetching: false,
        error: undefined,
        stale: false,
      } as never,
      vi.fn(),
    ]);

    const { result } = renderHook(() => useSubtitleTracks('content-1'));
    expect(result.current).toEqual(tracks);
  });

  it('returns empty array when mediaAsset is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { contentItem: { mediaAsset: null } },
        fetching: false,
        error: undefined,
        stale: false,
      } as never,
      vi.fn(),
    ]);
    const { result } = renderHook(() => useSubtitleTracks('content-1'));
    expect(result.current).toEqual([]);
  });

  it('returns empty array on error', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Network error' },
        stale: false,
      } as never,
      vi.fn(),
    ]);
    const { result } = renderHook(() => useSubtitleTracks('content-1'));
    expect(result.current).toEqual([]);
  });

  it('passes pause:true when contentId is empty', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined, stale: false } as never,
      vi.fn(),
    ]);
    renderHook(() => useSubtitleTracks(''));
    const callArgs = vi.mocked(urql.useQuery).mock.calls[0]![0] as { pause?: boolean };
    expect(callArgs.pause).toBe(true);
  });
});
