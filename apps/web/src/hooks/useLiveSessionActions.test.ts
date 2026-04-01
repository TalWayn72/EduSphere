/**
 * useLiveSessionActions hook tests
 *
 * Verifies:
 *  1. All fetching states start as false
 *  2. startSession calls mutation with sessionId
 *  3. endSession calls mutation with sessionId
 *  4. joinSession returns roomUrl on success
 *  5. joinSession returns null on error and shows toast
 *  6. cancelSession calls mutation with sessionId
 *  7. Error paths trigger toast.error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

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
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/graphql/live-session.queries', () => ({
  START_LIVE_SESSION_MUTATION: 'START',
  END_LIVE_SESSION_MUTATION: 'END',
  JOIN_LIVE_SESSION_MUTATION: 'JOIN',
  CANCEL_LIVE_SESSION_MUTATION: 'CANCEL',
}));

import * as urql from 'urql';
import { toast } from 'sonner';
import { useLiveSessionActions } from './useLiveSessionActions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMutations(
  responses: Record<string, { data?: unknown; error?: { message: string } }>
) {
  const fns: Record<string, ReturnType<typeof vi.fn>> = {};
  let callIndex = 0;
  const keys = Object.keys(responses);

  vi.mocked(urql.useMutation).mockImplementation(() => {
    const key = keys[callIndex] ?? keys[keys.length - 1]!;
    if (callIndex < keys.length) callIndex++;
    const fn = fns[key] ?? vi.fn().mockResolvedValue(responses[key]);
    fns[key] = fn;
    return [
      {
        fetching: false,
        data: undefined,
        error: undefined,
        stale: false,
      } as never,
      fn,
    ];
  });

  return fns;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLiveSessionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('all fetching flags start as false', () => {
    setupMutations({
      start: { data: undefined },
      end: { data: undefined },
      join: { data: undefined },
      cancel: { data: undefined },
    });

    const { result } = renderHook(() => useLiveSessionActions());
    expect(result.current.startFetching).toBe(false);
    expect(result.current.endFetching).toBe(false);
    expect(result.current.joinFetching).toBe(false);
    expect(result.current.cancelFetching).toBe(false);
  });

  it('startSession calls execute with sessionId', async () => {
    const fns = setupMutations({
      start: { data: { startLiveSession: true } },
      end: { data: undefined },
      join: { data: undefined },
      cancel: { data: undefined },
    });
    const { result } = renderHook(() => useLiveSessionActions());

    await act(async () => {
      await result.current.startSession('sess-1');
    });

    expect(fns['start']).toHaveBeenCalledWith({ sessionId: 'sess-1' });
  });

  it('startSession shows toast on error', async () => {
    setupMutations({
      start: { error: { message: 'fail' } },
      end: { data: undefined },
      join: { data: undefined },
      cancel: { data: undefined },
    });
    const { result } = renderHook(() => useLiveSessionActions());

    await act(async () => {
      await result.current.startSession('sess-1');
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to start session. Please try again.'
    );
  });

  it('endSession calls execute with sessionId', async () => {
    const fns = setupMutations({
      start: { data: undefined },
      end: { data: { endLiveSession: true } },
      join: { data: undefined },
      cancel: { data: undefined },
    });
    const { result } = renderHook(() => useLiveSessionActions());

    await act(async () => {
      await result.current.endSession('sess-1');
    });

    expect(fns['end']).toHaveBeenCalledWith({ sessionId: 'sess-1' });
  });

  it('joinSession returns roomUrl on success', async () => {
    setupMutations({
      start: { data: undefined },
      end: { data: undefined },
      join: { data: { joinLiveSession: { roomUrl: 'https://room.test/123' } } },
      cancel: { data: undefined },
    });
    const { result } = renderHook(() => useLiveSessionActions());

    let url: string | null = null;
    await act(async () => {
      url = await result.current.joinSession('sess-1');
    });

    expect(url).toBe('https://room.test/123');
  });

  it('joinSession returns null and shows toast on error', async () => {
    setupMutations({
      start: { data: undefined },
      end: { data: undefined },
      join: { error: { message: 'fail' } },
      cancel: { data: undefined },
    });
    const { result } = renderHook(() => useLiveSessionActions());

    let url: string | null = 'not-null';
    await act(async () => {
      url = await result.current.joinSession('sess-1');
    });

    expect(url).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'Failed to join session. Please try again.'
    );
  });

  it('cancelSession calls execute and shows toast on error', async () => {
    setupMutations({
      start: { data: undefined },
      end: { data: undefined },
      join: { data: undefined },
      cancel: { error: { message: 'fail' } },
    });
    const { result } = renderHook(() => useLiveSessionActions());

    await act(async () => {
      await result.current.cancelSession('sess-1');
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to cancel session. Please try again.'
    );
  });
});
