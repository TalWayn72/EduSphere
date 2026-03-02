/**
 * useScormSession hook tests
 *
 * Verifies:
 *  1.  session is null initially (no mutation result yet)
 *  2.  fetching is false initially
 *  3.  error is null initially
 *  4.  initSession calls the mutation with contentItemId
 *  5.  session is populated from result.data?.initScormSession
 *  6.  error.message surfaced from result.error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock — MUST be before any imports ─────────────────────────────────────
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

// ── Import after mocks ─────────────────────────────────────────────────────────
import { useScormSession, type ScormSessionResult } from './useScormSession';
import * as urql from 'urql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScormSession(
  overrides: Partial<ScormSessionResult> = {}
): ScormSessionResult {
  return {
    id: 'session-1',
    lessonStatus: 'incomplete',
    scoreRaw: null,
    suspendData: null,
    ...overrides,
  };
}

type MutationState = ReturnType<typeof urql.useMutation>[0] & {
  data?: { initScormSession: ScormSessionResult };
  error?: urql.CombinedError;
  fetching: boolean;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useScormSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: idle state — no data, not fetching, no error
    const mockInitSession = vi
      .fn()
      .mockResolvedValue({ data: undefined, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockInitSession as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);
  });

  // Test 1 — session is null initially
  it('returns session=null before any mutation is called', () => {
    const { result } = renderHook(() => useScormSession());
    expect(result.current.session).toBeNull();
  });

  // Test 2 — fetching is false initially
  it('returns fetching=false initially', () => {
    const { result } = renderHook(() => useScormSession());
    expect(result.current.fetching).toBe(false);
  });

  // Test 3 — error is null initially
  it('returns error=null initially', () => {
    const { result } = renderHook(() => useScormSession());
    expect(result.current.error).toBeNull();
  });

  // Test 4 — initSession calls the mutation with contentItemId
  it('calls the mutation with the given contentItemId', async () => {
    const mockInitSession = vi
      .fn()
      .mockResolvedValue({ data: undefined, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockInitSession as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useScormSession());

    await act(async () => {
      await result.current.initSession('scorm-content-42');
    });

    expect(mockInitSession).toHaveBeenCalledWith({
      contentItemId: 'scorm-content-42',
    });
  });

  // Test 5 — session populated from result.data
  it('exposes session data from the mutation result', () => {
    const scormSession = makeScormSession({
      id: 'sess-abc',
      lessonStatus: 'passed',
      scoreRaw: 92,
    });

    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: { initScormSession: scormSession },
        error: undefined,
      } as unknown as MutationState,
      vi.fn().mockResolvedValue({
        data: { initScormSession: scormSession },
        error: undefined,
      }) as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useScormSession());

    expect(result.current.session).toEqual(scormSession);
    expect(result.current.session?.id).toBe('sess-abc');
    expect(result.current.session?.scoreRaw).toBe(92);
  });

  // Test 6 — error.message surfaced from result.error
  it('surfaces the error message from result.error', () => {
    const mutationError = {
      message: 'SCORM session init failed',
    } as urql.CombinedError;

    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: mutationError,
      } as unknown as MutationState,
      vi.fn().mockResolvedValue({
        data: undefined,
        error: mutationError,
      }) as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useScormSession());

    expect(result.current.error).toBe('SCORM session init failed');
    expect(result.current.session).toBeNull();
  });
});
