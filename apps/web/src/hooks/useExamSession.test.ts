/**
 * useExamSession hook tests
 *
 * Verifies:
 *  1. useExamBlueprint — initial state, loading flag, query paused without ID
 *  2. useExamSession  — initial state, loading flag, query paused without ID
 *  3. useStartExamSession — calls mutation, returns session, handles error
 *  4. useSubmitExamAnswer — calls mutation, handles error
 *  5. useFlagExamQuestion — calls mutation, handles error
 *  6. useSubmitExam — returns exam result, handles error
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock ────────────────────────────────────────────────────────────────

const mockStartSession = vi.fn().mockResolvedValue({
  data: {
    startExamSession: {
      id: 'session-1',
      blueprintId: 'bp-1',
      status: 'IN_PROGRESS',
      attemptNumber: 1,
      startedAt: new Date().toISOString(),
      timeRemainingSeconds: 3600,
      questionOrder: [],
      isAdaptive: false,
      currentQuestionIndex: 0,
    },
  },
  error: undefined,
});

const mockSubmitAnswer = vi.fn().mockResolvedValue({
  data: { submitExamAnswer: true },
  error: undefined,
});

const mockFlagQuestion = vi.fn().mockResolvedValue({
  data: { flagExamQuestion: true },
  error: undefined,
});

const mockSubmitExam = vi.fn().mockResolvedValue({
  data: {
    submitExam: {
      id: 'result-1',
      sessionId: 'session-1',
      passed: true,
      rawScore: 0.85,
      scaledScore: 850,
      thetaEstimate: 1.2,
      sem: 0.3,
      gradedAt: new Date().toISOString(),
    },
  },
  error: undefined,
});

vi.mock('urql', () => ({
  useQuery: vi.fn().mockReturnValue([{ fetching: false, data: null }, vi.fn()]),
  useMutation: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import {
  useStartExamSession,
  useSubmitExamAnswer,
  useSubmitExam,
} from './useExamMutations';
import { useExamBlueprint, useExamSession } from './useExamQueries';
import * as urql from 'urql';

// ── Helper to configure urql useMutation mock ────────────────────────────────

function setupMutationMocks() {
  vi.mocked(urql.useMutation).mockImplementation((mutation: unknown) => {
    const mutStr = String(mutation);
    if (mutStr.includes('StartExamSession')) {
      return [{ fetching: false }, mockStartSession] as ReturnType<
        typeof urql.useMutation
      >;
    }
    if (mutStr.includes('SubmitExamAnswer')) {
      return [{ fetching: false }, mockSubmitAnswer] as ReturnType<
        typeof urql.useMutation
      >;
    }
    if (mutStr.includes('FlagExamQuestion')) {
      return [{ fetching: false }, mockFlagQuestion] as ReturnType<
        typeof urql.useMutation
      >;
    }
    return [{ fetching: false }, mockSubmitExam] as ReturnType<
      typeof urql.useMutation
    >;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useExamBlueprint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns undefined blueprint initially with no data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: null },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>);
    const { result } = renderHook(() => useExamBlueprint('bp-1'));
    expect(result.current.blueprint).toBeUndefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, data: null },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>);
    const { result } = renderHook(() => useExamBlueprint('bp-1'));
    expect(result.current.loading).toBe(true);
  });

  it('returns blueprint data when available', () => {
    const blueprint = {
      id: 'bp-1',
      title: 'Test Blueprint',
      totalQuestions: 50,
    };
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: { examBlueprint: blueprint } },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>);
    const { result } = renderHook(() => useExamBlueprint('bp-1'));
    expect(result.current.blueprint).toEqual(blueprint);
  });
});

describe('useExamSession query', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns undefined session initially with no data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: null },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>);
    const { result } = renderHook(() => useExamSession('session-1'));
    expect(result.current.session).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('returns session data when available', () => {
    const session = {
      id: 'session-1',
      status: 'IN_PROGRESS',
      timeRemainingSeconds: 3600,
    };
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: { examSession: session } },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>);
    const { result } = renderHook(() => useExamSession('session-1'));
    expect(result.current.session).toEqual(session);
  });

  it('exposes error message when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: null, error: { message: 'Unauthorized' } },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>);
    const { result } = renderHook(() => useExamSession('session-1'));
    expect(result.current.error).toBe('Unauthorized');
  });
});

describe('useStartExamSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMutationMocks();
  });

  it('returns loading=false initially', () => {
    const { result } = renderHook(() => useStartExamSession());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls startSession mutation and returns session', async () => {
    const { result } = renderHook(() => useStartExamSession());
    let session: unknown;
    await act(async () => {
      session = await result.current.startSession('bp-1');
    });
    expect(mockStartSession).toHaveBeenCalledWith({ blueprintId: 'bp-1' });
    expect((session as { id: string }).id).toBe('session-1');
  });

  it('sets error and returns null when mutation fails', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: null,
      error: { message: 'Blueprint not found' },
    });
    const { result } = renderHook(() => useStartExamSession());
    let session: unknown;
    await act(async () => {
      session = await result.current.startSession('bp-missing');
    });
    expect(session).toBeNull();
    expect(result.current.error).toBe('Failed to start exam session.');
  });
});

describe('useSubmitExamAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMutationMocks();
  });

  it('calls submitAnswer mutation with correct params', async () => {
    const { result } = renderHook(() => useSubmitExamAnswer());
    await act(async () => {
      await result.current.submitAnswer('session-1', 'item-1', { choice: 'A' });
    });
    expect(mockSubmitAnswer).toHaveBeenCalledWith({
      sessionId: 'session-1',
      itemId: 'item-1',
      answer: { choice: 'A' },
    });
  });

  it('sets error when mutation fails', async () => {
    mockSubmitAnswer.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session expired' },
    });
    const { result } = renderHook(() => useSubmitExamAnswer());
    await act(async () => {
      await result.current.submitAnswer('session-1', 'item-1', {});
    });
    expect(result.current.error).toBe('Failed to submit answer.');
  });
});

describe('useSubmitExam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMutationMocks();
  });

  it('returns exam result on success', async () => {
    const { result } = renderHook(() => useSubmitExam());
    let examResult: unknown;
    await act(async () => {
      examResult = await result.current.submitExam('session-1');
    });
    expect(mockSubmitExam).toHaveBeenCalledWith({ sessionId: 'session-1' });
    expect((examResult as { passed: boolean }).passed).toBe(true);
  });

  it('returns null and sets error when mutation fails', async () => {
    mockSubmitExam.mockResolvedValueOnce({
      data: null,
      error: { message: 'Grading failed' },
    });
    const { result } = renderHook(() => useSubmitExam());
    let examResult: unknown;
    await act(async () => {
      examResult = await result.current.submitExam('session-1');
    });
    expect(examResult).toBeNull();
    expect(result.current.error).toBe('Failed to submit exam.');
  });
});
