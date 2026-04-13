/**
 * useLiveTranscript hook tests
 *
 * Covers:
 *  1. Initial fetch populates and sorts segments
 *  2. Subscription appends new (distinct-index) segment
 *  3. Partial→final merge: same index, not yet final → replaced
 *  4. Already-final segment not replaced by incoming with same index
 *  5. fetching reflects query loading state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/live-stream-session.queries', () => ({
  LIVE_TRANSCRIPT_QUERY: 'LIVE_TRANSCRIPT_QUERY',
  LIVE_TRANSCRIPT_UPDATED_SUB: 'LIVE_TRANSCRIPT_UPDATED_SUB',
}));

import * as urql from 'urql';
import { useLiveTranscript } from './useLiveTranscript';
import type { LiveTranscriptSegment } from '@/types/live-session.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSegment(index: number, text: string, isFinal = true): LiveTranscriptSegment {
  return {
    index,
    text,
    isFinal,
    speakerLabel: null,
    startMs: index * 1000,
    endMs: index * 1000 + 500,
    jargonHits: [],
  };
}

function setupMocks({
  querySegments = [] as LiveTranscriptSegment[],
  queryFetching = false,
  subSegment = null as LiveTranscriptSegment | null,
} = {}) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { liveTranscript: querySegments },
      fetching: queryFetching,
      error: undefined,
      stale: false,
    },
    vi.fn(),
  ] as never);

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: { liveTranscriptUpdated: subSegment }, fetching: false },
    vi.fn(),
  ] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLiveTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('populates segments from initial query', async () => {
    const segs = [makeSegment(0, 'Hello'), makeSegment(1, 'World')];
    setupMocks({ querySegments: segs });
    const { result } = renderHook(() => useLiveTranscript('sess-1'));

    await waitFor(() => {
      expect(result.current.segments).toHaveLength(2);
    });

    expect(result.current.segments[0]!.text).toBe('Hello');
    expect(result.current.segments[1]!.text).toBe('World');
  });

  it('sorts initial segments by index', async () => {
    const segs = [makeSegment(2, 'Third'), makeSegment(0, 'First'), makeSegment(1, 'Second')];
    setupMocks({ querySegments: segs });
    const { result } = renderHook(() => useLiveTranscript('sess-1'));

    await waitFor(() => {
      expect(result.current.segments).toHaveLength(3);
    });

    expect(result.current.segments.map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('starts with empty segments when query returns empty array', async () => {
    setupMocks({ querySegments: [] });
    const { result } = renderHook(() => useLiveTranscript('sess-1'));

    await waitFor(() => {
      expect(result.current.fetching).toBe(false);
    });

    expect(result.current.segments).toHaveLength(0);
  });

  it('reflects fetching true from query', () => {
    setupMocks({ queryFetching: true });
    const { result } = renderHook(() => useLiveTranscript('sess-1'));
    expect(result.current.fetching).toBe(true);
  });

  it('appends new segment from subscription when index is new', async () => {
    const initial = [makeSegment(0, 'Hello')];
    const incoming = makeSegment(1, 'World');
    setupMocks({ querySegments: initial, subSegment: incoming });
    const { result } = renderHook(() => useLiveTranscript('sess-1'));

    await waitFor(() => {
      expect(result.current.segments).toHaveLength(2);
    });

    expect(result.current.segments[1]!.text).toBe('World');
  });

  it('replaces partial segment with same index from subscription', async () => {
    const partial = makeSegment(0, 'Hel...', false);
    const finalSeg = makeSegment(0, 'Hello world', true);

    // First render: initial segment is partial
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { liveTranscript: [partial] }, fetching: false, error: undefined, stale: false },
      vi.fn(),
    ] as never);
    vi.mocked(urql.useSubscription).mockReturnValue([
      { data: { liveTranscriptUpdated: finalSeg }, fetching: false },
      vi.fn(),
    ] as never);

    const { result } = renderHook(() => useLiveTranscript('sess-1'));

    await waitFor(() => {
      const seg = result.current.segments.find((s) => s.index === 0);
      expect(seg?.isFinal).toBe(true);
    });

    expect(result.current.segments[0]!.text).toBe('Hello world');
    expect(result.current.segments).toHaveLength(1);
  });

  it('does not replace already-final segment with same index', async () => {
    const finalSeg = makeSegment(0, 'Original final', true);
    const duplicateFinal = makeSegment(0, 'Duplicate attempt', true);

    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { liveTranscript: [finalSeg] }, fetching: false, error: undefined, stale: false },
      vi.fn(),
    ] as never);
    vi.mocked(urql.useSubscription).mockReturnValue([
      { data: { liveTranscriptUpdated: duplicateFinal }, fetching: false },
      vi.fn(),
    ] as never);

    const { result } = renderHook(() => useLiveTranscript('sess-1'));

    await waitFor(() => {
      expect(result.current.segments).toHaveLength(1);
    });

    expect(result.current.segments[0]!.text).toBe('Original final');
  });

  it('handles null subscription data gracefully', async () => {
    setupMocks({ querySegments: [makeSegment(0, 'Hello')], subSegment: null });
    const { result } = renderHook(() => useLiveTranscript('sess-1'));

    await waitFor(() => {
      expect(result.current.segments).toHaveLength(1);
    });
  });
});
