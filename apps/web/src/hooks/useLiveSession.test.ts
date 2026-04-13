/**
 * useLiveSession hook tests
 *
 * Covers:
 *  1. join mutation called on mount with sessionId
 *  2. leave mutation called on unmount
 *  3. viewerToken set from join result
 *  4. subscription updates merge into session state
 *  5. fetching reflects query loading state
 *  6. error forwarded from query
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
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/live-stream-session.queries', () => ({
  LIVE_STREAM_SESSION_QUERY: 'LIVE_STREAM_SESSION_QUERY',
  JOIN_LIVE_SESSION_MUTATION: 'JOIN',
  LEAVE_LIVE_SESSION_MUTATION: 'LEAVE',
  LIVE_SESSION_STATUS_SUB: 'STATUS_SUB',
}));

import * as urql from 'urql';
import { useLiveSession } from './useLiveSession';

// ── Shared fixtures ────────────────────────────────────────────────────────────

const BASE_SESSION = {
  id: 'sess-1',
  title: 'Test Session',
  courseId: 'course-1',
  instructorId: 'instr-1',
  phase: 'LIVE' as const,
  streamType: 'BROADCAST' as const,
  streamUrl: 'https://stream.test',
  thumbnailUrl: null,
  viewerCount: 42,
  maxViewers: null,
  scheduledAt: null,
  startedAt: '2026-01-01T10:00:00Z',
  endedAt: null,
  isScreenSharing: false,
  highlightMoments: [],
  recordingUrl: null,
  createdAt: '2026-01-01T09:00:00Z',
};

function setupMocks({
  sessionData = BASE_SESSION,
  queryFetching = false,
  queryError = undefined as Error | undefined,
  joinData = { joinLiveStream: { sessionId: 'sess-1', viewerToken: 'tok-abc', streamUrl: 'https://stream.test' } },
  subData = undefined as { liveSessionStatus: { sessionId: string; phase: string; viewerCount: number; isScreenSharing: boolean; highlightMoments: unknown[] } } | undefined,
} = {}) {
  const executeJoin = vi.fn().mockResolvedValue({ data: joinData });
  const executeLeave = vi.fn().mockResolvedValue({ data: { leaveLiveStream: { success: true } } });

  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { liveStreamSession: sessionData },
      fetching: queryFetching,
      error: queryError,
      stale: false,
    },
    vi.fn(),
  ] as never);

  vi.mocked(urql.useMutation)
    .mockReturnValue([{} as never, vi.fn() as never])
    .mockReturnValueOnce([{ fetching: false } as never, executeJoin as never])
    .mockReturnValueOnce([{ fetching: false } as never, executeLeave as never]);

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: subData, fetching: false },
    vi.fn(),
  ] as never);

  return { executeJoin, executeLeave };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLiveSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session from query data', () => {
    setupMocks();
    const { result } = renderHook(() => useLiveSession('sess-1'));
    expect(result.current.session?.id).toBe('sess-1');
    expect(result.current.session?.title).toBe('Test Session');
  });

  it('forwards fetching state from query', () => {
    setupMocks({ queryFetching: true });
    const { result } = renderHook(() => useLiveSession('sess-1'));
    expect(result.current.fetching).toBe(true);
  });

  it('forwards error from query', () => {
    const err = new Error('network error');
    setupMocks({ queryError: err });
    const { result } = renderHook(() => useLiveSession('sess-1'));
    expect(result.current.error).toBe(err);
  });

  it('sets viewerToken from join mutation result', async () => {
    setupMocks();
    const { result } = renderHook(() => useLiveSession('sess-1'));

    await waitFor(() => {
      expect(result.current.viewerToken).toBe('tok-abc');
    });
  });

  it('join mutation called with sessionId on mount', async () => {
    const { executeJoin } = setupMocks();
    renderHook(() => useLiveSession('sess-1'));

    await waitFor(() => {
      expect(executeJoin).toHaveBeenCalledWith({ sessionId: 'sess-1' });
    });
  });

  it('leave mutation called on unmount', async () => {
    const { executeLeave } = setupMocks();
    const { unmount } = renderHook(() => useLiveSession('sess-1'));

    await waitFor(() => {});
    unmount();

    expect(executeLeave).toHaveBeenCalledWith({ sessionId: 'sess-1' });
  });

  it('merges subscription phase update into session', () => {
    setupMocks({
      subData: {
        liveSessionStatus: {
          sessionId: 'sess-1',
          phase: 'PAUSED',
          viewerCount: 10,
          isScreenSharing: true,
          highlightMoments: [],
        },
      },
    });
    const { result } = renderHook(() => useLiveSession('sess-1'));
    expect(result.current.session?.phase).toBe('PAUSED');
    expect(result.current.session?.viewerCount).toBe(10);
    expect(result.current.session?.isScreenSharing).toBe(true);
  });

  it('returns null session when query data is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { liveStreamSession: null }, fetching: false, error: undefined, stale: false },
      vi.fn(),
    ] as never);
    vi.mocked(urql.useMutation)
      .mockReturnValue([{} as never, vi.fn().mockResolvedValue({ data: null }) as never]);
    vi.mocked(urql.useSubscription).mockReturnValue([
      { data: undefined, fetching: false },
      vi.fn(),
    ] as never);

    const { result } = renderHook(() => useLiveSession('sess-1'));
    expect(result.current.session).toBeNull();
  });

  it('viewerToken starts as null', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: null, fetching: true, error: undefined, stale: false },
      vi.fn(),
    ] as never);
    const slowJoin = vi.fn().mockResolvedValue(new Promise(() => {}));
    vi.mocked(urql.useMutation)
      .mockReturnValue([{} as never, vi.fn() as never])
      .mockReturnValueOnce([{} as never, slowJoin as never])
      .mockReturnValueOnce([{} as never, vi.fn() as never]);
    vi.mocked(urql.useSubscription).mockReturnValue([
      { data: undefined, fetching: false },
      vi.fn(),
    ] as never);

    const { result } = renderHook(() => useLiveSession('sess-1'));
    expect(result.current.viewerToken).toBeNull();
  });
});
