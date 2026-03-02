// vi.mock must be hoisted before any imports
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  CONTENT_ITEM_QUERY: 'CONTENT_ITEM_QUERY',
  COURSE_DETAIL_QUERY: 'COURSE_DETAIL_QUERY',
}));

vi.mock('@/lib/mock-content-data', () => ({
  mockVideo: { url: 'http://mock.mp4', title: 'Mock Video' },
  mockTranscript: [{ id: 's1', startTime: 0, endTime: 5, text: 'Hello' }],
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as urql from 'urql';
import { useContentData } from './useContentData';

type UseQueryReturn = [
  { data: unknown; fetching: boolean; error: unknown },
  () => void,
];

function makeResult(
  overrides: Partial<{ data: unknown; fetching: boolean; error: unknown }>
): UseQueryReturn {
  return [
    { data: undefined, fetching: false, error: undefined, ...overrides },
    vi.fn(),
  ];
}

beforeEach(() => {
  vi.mocked(urql.useQuery).mockReturnValue(makeResult({}));
});

describe('useContentData', () => {
  it('returns mock data when query returns no contentItem', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ data: { contentItem: null } })
    );
    const { result } = renderHook(() => useContentData('item-1'));
    expect(result.current.videoUrl).toBe('http://mock.mp4');
    expect(result.current.videoTitle).toBe('Mock Video');
    expect(result.current.transcript).toEqual([
      { id: 's1', startTime: 0, endTime: 5, text: 'Hello' },
    ]);
  });

  it('returns real item data when query succeeds', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          contentItem: {
            id: 'ci-1',
            title: 'My Video',
            mediaAsset: {
              id: 'ma-1',
              url: 'http://real.mp4',
              hlsManifestUrl: 'http://real.m3u8',
            },
            transcript: {
              segments: [{ id: 't1', startTime: 1, endTime: 3, text: 'World' }],
            },
          },
        },
      })
    );
    const { result } = renderHook(() => useContentData('ci-1'));
    expect(result.current.videoUrl).toBe('http://real.mp4');
    expect(result.current.videoTitle).toBe('My Video');
    expect(result.current.hlsManifestUrl).toBe('http://real.m3u8');
    expect(result.current.transcript).toEqual([
      { id: 't1', startTime: 1, endTime: 3, text: 'World' },
    ]);
  });

  it('pauses query when contentId is empty string', () => {
    renderHook(() => useContentData(''));
    const callArgs = vi.mocked(urql.useQuery).mock.calls[0]?.[0] as {
      pause?: boolean;
    };
    expect(callArgs?.pause).toBe(true);
  });

  it('reflects fetching=true from the result', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeResult({ fetching: true }));
    const { result } = renderHook(() => useContentData('item-1'));
    expect(result.current.fetching).toBe(true);
  });

  it('error is null when query succeeds', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          contentItem: {
            id: 'c1',
            title: 'T',
            mediaAsset: null,
            transcript: null,
          },
        },
      })
    );
    const { result } = renderHook(() => useContentData('item-1'));
    expect(result.current.error).toBeNull();
  });

  it('returns error message when query errors and no item', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({ error: { message: 'Network failure' } as unknown })
    );
    const { result } = renderHook(() => useContentData('item-1'));
    expect(result.current.error).toBe('Network failure');
  });

  it('maps transcript segments from real data', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          contentItem: {
            id: 'ci-2',
            title: 'Mapped',
            mediaAsset: { id: 'ma-2', url: 'http://x.mp4' },
            transcript: {
              segments: [
                {
                  id: 'seg1',
                  startTime: 0,
                  endTime: 2,
                  text: 'Foo',
                  confidence: 0.9,
                  speakerId: 'sp1',
                },
                { id: 'seg2', startTime: 2, endTime: 4, text: 'Bar' },
              ],
            },
          },
        },
      })
    );
    const { result } = renderHook(() => useContentData('ci-2'));
    expect(result.current.transcript).toHaveLength(2);
    expect(result.current.transcript[0]).toEqual({
      id: 'seg1',
      startTime: 0,
      endTime: 2,
      text: 'Foo',
    });
  });

  it('hlsManifestUrl is null when mediaAsset has no hls url', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeResult({
        data: {
          contentItem: {
            id: 'ci-3',
            title: 'NoHLS',
            mediaAsset: {
              id: 'ma-3',
              url: 'http://plain.mp4',
              hlsManifestUrl: null,
            },
            transcript: null,
          },
        },
      })
    );
    const { result } = renderHook(() => useContentData('ci-3'));
    expect(result.current.hlsManifestUrl).toBeNull();
  });
});
