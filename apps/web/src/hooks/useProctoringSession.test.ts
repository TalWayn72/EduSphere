/**
 * useProctoringSession hook tests
 *
 * Verifies:
 *  1. Initial state: null session, not active
 *  2. start() calls mutation and sets session state
 *  3. flag() calls mutation and updates flagCount
 *  4. flag() does nothing without a sessionId
 *  5. end() calls mutation, updates state, clears sessionId
 *  6. end() does nothing without a sessionId
 *  7. isActive is true for ACTIVE or FLAGGED status
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

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

vi.mock('@/lib/graphql/proctoring.queries', () => ({
  START_PROCTORING_SESSION_MUTATION: 'START_PROCTORING',
  FLAG_PROCTORING_EVENT_MUTATION: 'FLAG_PROCTORING',
  END_PROCTORING_SESSION_MUTATION: 'END_PROCTORING',
}));

import * as urql from 'urql';
import { useProctoringSession } from './useProctoringSession';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Stable mock fns that persist across re-renders
let executeStart: ReturnType<typeof vi.fn>;
let executeFlag: ReturnType<typeof vi.fn>;
let executeEnd: ReturnType<typeof vi.fn>;

function setupMocks(
  startResult: { data?: unknown; error?: unknown } = {},
  flagResult: { data?: unknown; error?: unknown } = {},
  endResult: { data?: unknown; error?: unknown } = {}
) {
  executeStart = vi.fn().mockResolvedValue(startResult);
  executeFlag = vi.fn().mockResolvedValue(flagResult);
  executeEnd = vi.fn().mockResolvedValue(endResult);

  let callCount = 0;
  vi.mocked(urql.useMutation).mockImplementation(() => {
    // useMutation is called 3 times per render: start, flag, end (in order)
    const idx = callCount % 3;
    callCount++;
    const fns = [executeStart, executeFlag, executeEnd];
    return [
      {
        fetching: false,
        data: undefined,
        error: undefined,
        stale: false,
      } as never,
      fns[idx]!,
    ];
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useProctoringSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default state', () => {
    setupMocks();
    const { result } = renderHook(() => useProctoringSession('assess-1'));
    expect(result.current.sessionId).toBeNull();
    expect(result.current.status).toBeNull();
    expect(result.current.flagCount).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('start() calls mutation and sets session state', async () => {
    const session = { id: 'proc-1', status: 'ACTIVE', flagCount: 0 };
    setupMocks({ data: { startProctoringSession: session } });

    const { result } = renderHook(() => useProctoringSession('assess-1'));

    await act(async () => {
      await result.current.start();
    });

    expect(executeStart).toHaveBeenCalledWith({ assessmentId: 'assess-1' });
    expect(result.current.sessionId).toBe('proc-1');
    expect(result.current.status).toBe('ACTIVE');
    expect(result.current.isActive).toBe(true);
  });

  it('flag() calls mutation and updates flag count', async () => {
    const startSession = { id: 'proc-1', status: 'ACTIVE', flagCount: 0 };
    const flaggedSession = { id: 'proc-1', status: 'FLAGGED', flagCount: 1 };

    setupMocks(
      { data: { startProctoringSession: startSession } },
      { data: { flagProctoringEvent: flaggedSession } }
    );

    const { result } = renderHook(() => useProctoringSession('assess-1'));

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.flag('TAB_SWITCH', 'User switched tab');
    });

    expect(executeFlag).toHaveBeenCalledWith({
      sessionId: 'proc-1',
      type: 'TAB_SWITCH',
      detail: 'User switched tab',
    });
    expect(result.current.status).toBe('FLAGGED');
    expect(result.current.flagCount).toBe(1);
    expect(result.current.isActive).toBe(true);
  });

  it('flag() does nothing without a sessionId', async () => {
    setupMocks();
    const { result } = renderHook(() => useProctoringSession('assess-1'));

    await act(async () => {
      await result.current.flag('TAB_SWITCH');
    });

    expect(executeFlag).not.toHaveBeenCalled();
  });

  it('end() calls mutation, updates state, clears sessionId', async () => {
    const startSession = { id: 'proc-1', status: 'ACTIVE', flagCount: 0 };
    const endedSession = { id: 'proc-1', status: 'COMPLETED', flagCount: 0 };

    setupMocks(
      { data: { startProctoringSession: startSession } },
      {},
      { data: { endProctoringSession: endedSession } }
    );

    const { result } = renderHook(() => useProctoringSession('assess-1'));

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.end();
    });

    expect(executeEnd).toHaveBeenCalledWith({ sessionId: 'proc-1' });
    expect(result.current.sessionId).toBeNull();
    expect(result.current.status).toBe('COMPLETED');
    expect(result.current.isActive).toBe(false);
  });

  it('end() does nothing without a sessionId', async () => {
    setupMocks();
    const { result } = renderHook(() => useProctoringSession('assess-1'));

    await act(async () => {
      await result.current.end();
    });

    expect(executeEnd).not.toHaveBeenCalled();
  });
});
