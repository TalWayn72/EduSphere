/**
 * useSubmitAssignment hook tests
 *
 * Verifies:
 *  1.  loading=false and error=null initially
 *  2.  submit calls mutation with correct args
 *  3.  returns SubmittedAssignment on success
 *  4.  returns null and sets error on mutation error
 *  5.  catches thrown errors
 *  6.  passes contentItemId and courseId correctly
 *  7.  resets error between calls
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
import {
  useSubmitAssignment,
  type SubmittedAssignment,
} from './useSubmitAssignment';
import * as urql from 'urql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAssignment(
  overrides: Partial<SubmittedAssignment> = {}
): SubmittedAssignment {
  return {
    id: 'assign-1',
    contentItemId: 'item-1',
    submittedAt: '2026-01-01T00:00:00Z',
    wordCount: 120,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSubmitAssignment', () => {
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

  // Test 1 — loading and error initial state
  it('returns loading=false and error=null initially', () => {
    const { result } = renderHook(() =>
      useSubmitAssignment('item-1', 'course-1')
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Test 2 — submit calls mutation with correct args
  it('calls the mutation with contentItemId, courseId, and textContent', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: { submitTextAssignment: makeAssignment() },
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

    const { result } = renderHook(() =>
      useSubmitAssignment('item-abc', 'course-xyz')
    );

    await act(async () => {
      await result.current.submit('My essay text');
    });

    expect(mockExecute).toHaveBeenCalledWith({
      contentItemId: 'item-abc',
      courseId: 'course-xyz',
      textContent: 'My essay text',
    });
  });

  // Test 3 — returns SubmittedAssignment on success
  it('returns the submitted assignment from mutation data on success', async () => {
    const assignment = makeAssignment({ wordCount: 250 });
    const mockExecute = vi.fn().mockResolvedValue({
      data: { submitTextAssignment: assignment },
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

    const { result } = renderHook(() =>
      useSubmitAssignment('item-1', 'course-1')
    );

    let returned: SubmittedAssignment | null = null;
    await act(async () => {
      returned = await result.current.submit('Hello world essay');
    });

    expect(returned).toEqual(assignment);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  // Test 4 — returns null and sets error on mutation error
  it('returns null and sets error when the mutation returns an error', async () => {
    const mutationError = {
      message: 'Assignment submission failed',
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

    const { result } = renderHook(() =>
      useSubmitAssignment('item-1', 'course-1')
    );

    let returned: SubmittedAssignment | null = makeAssignment();
    await act(async () => {
      returned = await result.current.submit('My text');
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Assignment submission failed');
    expect(result.current.loading).toBe(false);
  });

  // Test 5 — catches thrown errors
  it('catches thrown errors and sets the error message', async () => {
    const mockExecute = vi.fn().mockRejectedValue(new Error('Network failure'));
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
      } as unknown as ReturnType<typeof urql.useMutation>[0],
      mockExecute as unknown as ReturnType<typeof urql.useMutation>[1],
    ]);

    const { result } = renderHook(() =>
      useSubmitAssignment('item-1', 'course-1')
    );

    let returned: SubmittedAssignment | null = makeAssignment();
    await act(async () => {
      returned = await result.current.submit('Some text');
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Network failure');
    expect(result.current.loading).toBe(false);
  });

  // Test 6 — passes contentItemId and courseId correctly
  it('correctly passes both contentItemId and courseId to the mutation', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: {
        submitTextAssignment: makeAssignment({ contentItemId: 'item-99' }),
      },
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

    const { result } = renderHook(() =>
      useSubmitAssignment('item-99', 'course-88')
    );

    await act(async () => {
      await result.current.submit('essay body');
    });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        contentItemId: 'item-99',
        courseId: 'course-88',
      })
    );
  });

  // Test 7 — resets error between calls
  it('clears the previous error at the start of each new submit call', async () => {
    const mockExecute = vi
      .fn()
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: 'First error' } as urql.CombinedError,
      })
      .mockResolvedValueOnce({
        data: { submitTextAssignment: makeAssignment() },
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

    const { result } = renderHook(() =>
      useSubmitAssignment('item-1', 'course-1')
    );

    // First call — sets error
    await act(async () => {
      await result.current.submit('bad text');
    });
    expect(result.current.error).toBe('First error');

    // Second call — error should clear and succeed
    await act(async () => {
      await result.current.submit('good text');
    });
    expect(result.current.error).toBeNull();
  });
});
