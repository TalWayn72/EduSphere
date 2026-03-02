/**
 * useGradeQuiz hook tests
 *
 * Verifies:
 *  1.  loading is false initially
 *  2.  error is null initially
 *  3.  gradeQuiz sets loading to true then resolves to false
 *  4.  gradeQuiz returns quiz result on success
 *  5.  gradeQuiz returns null and sets error on mutation error
 *  6.  gradeQuiz catches thrown errors
 *  7.  gradeQuiz resets error on each call
 *  8.  passes contentItemId to the mutation
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
import { useGradeQuiz } from './useGradeQuiz';
import type { QuizResult } from '@/types/quiz';
import * as urql from 'urql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQuizResult(overrides: Partial<QuizResult> = {}): QuizResult {
  return {
    id: 'result-1',
    score: 85,
    passed: true,
    itemResults: [{ itemIndex: 0, correct: true, explanation: 'Correct' }],
    submittedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useGradeQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: mutation resolves with no data and no error
    const mockExecute = vi
      .fn()
      .mockResolvedValue({ data: undefined, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);
  });

  // Test 1 — loading is false initially
  it('returns loading=false initially', () => {
    const { result } = renderHook(() => useGradeQuiz('item-1'));
    expect(result.current.loading).toBe(false);
  });

  // Test 2 — error is null initially
  it('returns error=null initially', () => {
    const { result } = renderHook(() => useGradeQuiz('item-1'));
    expect(result.current.error).toBeNull();
  });

  // Test 3 — gradeQuiz sets loading then resolves
  it('sets loading to false after mutation resolves', async () => {
    const mockExecute = vi
      .fn()
      .mockResolvedValue({
        data: { gradeQuizSubmission: makeQuizResult() },
        error: undefined,
      });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useGradeQuiz('item-1'));

    await act(async () => {
      await result.current.gradeQuiz({ 0: 'A' });
    });

    expect(result.current.loading).toBe(false);
  });

  // Test 4 — gradeQuiz returns quiz result on success
  it('returns the quiz result from mutation data on success', async () => {
    const quizResult = makeQuizResult({ score: 90, passed: true });
    const mockExecute = vi.fn().mockResolvedValue({
      data: { gradeQuizSubmission: quizResult },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useGradeQuiz('item-1'));

    let returned: QuizResult | null = null;
    await act(async () => {
      returned = await result.current.gradeQuiz({ 0: 'A', 1: 'B' });
    });

    expect(returned).toEqual(quizResult);
    expect(result.current.error).toBeNull();
  });

  // Test 5 — gradeQuiz returns null and sets error on mutation error
  it('returns null and sets error when the mutation returns an error', async () => {
    const mutationError = {
      message: 'Quiz grading failed',
    } as urql.CombinedError;
    const mockExecute = vi
      .fn()
      .mockResolvedValue({ data: undefined, error: mutationError });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useGradeQuiz('item-1'));

    let returned: QuizResult | null = makeQuizResult();
    await act(async () => {
      returned = await result.current.gradeQuiz({ 0: 'A' });
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Quiz grading failed');
  });

  // Test 6 — gradeQuiz catches thrown errors
  it('catches thrown errors and sets error message', async () => {
    const mockExecute = vi.fn().mockRejectedValue(new Error('Network crash'));
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useGradeQuiz('item-1'));

    let returned: QuizResult | null = makeQuizResult();
    await act(async () => {
      returned = await result.current.gradeQuiz({ 0: 'A' });
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Network crash');
    expect(result.current.loading).toBe(false);
  });

  // Test 7 — gradeQuiz resets error on each call
  it('clears the previous error at the start of each new gradeQuiz call', async () => {
    const mockExecute = vi
      .fn()
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: 'First error' } as urql.CombinedError,
      })
      .mockResolvedValueOnce({
        data: { gradeQuizSubmission: makeQuizResult() },
        error: undefined,
      });

    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useGradeQuiz('item-1'));

    // First call sets error
    await act(async () => {
      await result.current.gradeQuiz({ 0: 'A' });
    });
    expect(result.current.error).toBe('First error');

    // Second call should clear the error and succeed
    await act(async () => {
      await result.current.gradeQuiz({ 0: 'B' });
    });
    expect(result.current.error).toBeNull();
  });

  // Test 8 — passes contentItemId to mutation
  it('passes the contentItemId parameter to the mutation executor', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: { gradeQuizSubmission: makeQuizResult() },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() => useGradeQuiz('content-item-42'));

    await act(async () => {
      await result.current.gradeQuiz({ 0: 'C' });
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ contentItemId: 'content-item-42' })
    );
  });
});
