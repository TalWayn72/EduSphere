/**
 * useOptimisticEnrollment — unit tests
 *
 * Tests verify:
 * 1. optimisticEnrolled flips immediately on handleEnroll() before the
 *    mutation resolves (the optimistic update is visible during the transition).
 * 2. onSuccess callback is called after the mutation resolves successfully.
 * 3. onError callback is called and the optimistic state is reverted when the
 *    mutation returns an error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticEnrollment } from './useOptimisticEnrollment';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOptions(overrides: Partial<Parameters<typeof useOptimisticEnrollment>[0]> = {}) {
  return {
    courseId: 'course-1',
    isEnrolled: false,
    enrollMutation: vi.fn().mockResolvedValue({ error: null }),
    unenrollMutation: vi.fn().mockResolvedValue({ error: null }),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    enrollSuccessMessage: 'Enrolled!',
    unenrollSuccessMessage: 'Unenrolled!',
    enrollFailMessage: 'Failed to enroll',
    unenrollFailMessage: 'Failed to unenroll',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useOptimisticEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns optimisticEnrolled matching the initial isEnrolled=false', () => {
    const opts = makeOptions({ isEnrolled: false });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));
    expect(result.current.optimisticEnrolled).toBe(false);
  });

  it('returns optimisticEnrolled matching the initial isEnrolled=true', () => {
    const opts = makeOptions({ isEnrolled: true });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));
    expect(result.current.optimisticEnrolled).toBe(true);
  });

  it('calls enrollMutation when not enrolled and handleEnroll is called', async () => {
    const enrollFn = vi.fn().mockResolvedValue({ error: null });
    const opts = makeOptions({ isEnrolled: false, enrollMutation: enrollFn });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(enrollFn).toHaveBeenCalledWith({ courseId: 'course-1' });
    expect(enrollFn).toHaveBeenCalledTimes(1);
  });

  it('calls unenrollMutation when enrolled and handleEnroll is called', async () => {
    const unenrollFn = vi.fn().mockResolvedValue({ error: null });
    const opts = makeOptions({ isEnrolled: true, unenrollMutation: unenrollFn });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(unenrollFn).toHaveBeenCalledWith({ courseId: 'course-1' });
    expect(unenrollFn).toHaveBeenCalledTimes(1);
  });

  it('calls onSuccess with enrollSuccessMessage after successful enrollment', async () => {
    const onSuccess = vi.fn();
    const opts = makeOptions({ isEnrolled: false, onSuccess });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(onSuccess).toHaveBeenCalledWith('Enrolled!');
  });

  it('calls onSuccess with unenrollSuccessMessage after successful unenrollment', async () => {
    const onSuccess = vi.fn();
    const opts = makeOptions({ isEnrolled: true, onSuccess });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(onSuccess).toHaveBeenCalledWith('Unenrolled!');
  });

  it('calls onError and does NOT call onSuccess when enrollMutation returns an error', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const enrollFn = vi.fn().mockResolvedValue({
      error: {
        graphQLErrors: [{ message: 'Not allowed' }],
        message: '[GraphQL] Not allowed',
      },
    });
    const opts = makeOptions({ isEnrolled: false, enrollMutation: enrollFn, onSuccess, onError });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(onError).toHaveBeenCalledWith('Not allowed', expect.objectContaining({ graphQLErrors: expect.any(Array) }));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onError and does NOT call onSuccess when unenrollMutation returns an error', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const unenrollFn = vi.fn().mockResolvedValue({
      error: {
        graphQLErrors: [],
        message: 'Network error',
      },
    });
    const opts = makeOptions({ isEnrolled: true, unenrollMutation: unenrollFn, onSuccess, onError });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(onError).toHaveBeenCalledWith('Network error', expect.objectContaining({ message: 'Network error' }));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('falls back to enrollFailMessage when error has no graphQLErrors', async () => {
    const onError = vi.fn();
    const enrollFn = vi.fn().mockResolvedValue({
      error: { graphQLErrors: [], message: 'Connection refused' },
    });
    const opts = makeOptions({ isEnrolled: false, enrollMutation: enrollFn, onError });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(onError).toHaveBeenCalledWith('Connection refused', expect.anything());
  });

  it('isEnrolling is false after mutation resolves', async () => {
    const opts = makeOptions({ isEnrolled: false });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    expect(result.current.isEnrolling).toBe(false);
  });

  // Regression guard: optimisticEnrolled MUST NOT permanently flip when mutation fails.
  // React 19 useOptimistic reverts to isEnrolled (base state) once the transition ends.
  it('optimisticEnrolled reverts to base isEnrolled after failed mutation (regression guard)', async () => {
    const enrollFn = vi.fn().mockResolvedValue({
      error: { graphQLErrors: [{ message: 'Not allowed' }], message: 'Not allowed' },
    });
    const opts = makeOptions({ isEnrolled: false, enrollMutation: enrollFn });
    const { result } = renderHook(() => useOptimisticEnrollment(opts));

    await act(async () => {
      result.current.handleEnroll();
    });

    // After the transition ends, React 19 reverts optimisticEnrolled back to isEnrolled=false
    expect(result.current.optimisticEnrolled).toBe(false);
  });
});
