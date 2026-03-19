/**
 * useExamTimer memory safety tests
 *
 * Verifies:
 *  1.  clearInterval is called on unmount — no interval leaks
 *  2.  No interval ticks fire after unmount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExamSessionStore } from '@/stores/exam-session.store';
import { useExamTimer } from './useExamTimer';

describe('useExamTimer — memory safety', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useExamSessionStore.setState({ timeRemaining: 100 });
  });

  afterEach(() => {
    vi.useRealTimers();
    useExamSessionStore.getState().reset();
  });

  it('clears the interval on unmount (no leaks)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const onExpire = vi.fn();

    const { unmount } = renderHook(() => useExamTimer(100, onExpire));

    // Verify interval is running
    act(() => { vi.advanceTimersByTime(1000); });
    expect(useExamSessionStore.getState().timeRemaining).toBe(99);

    unmount();

    // clearInterval must have been called at least once during cleanup
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('does not decrement time after unmount', () => {
    const onExpire = vi.fn();
    const { unmount } = renderHook(() => useExamTimer(100, onExpire));

    act(() => { vi.advanceTimersByTime(1000); });
    const timeAfterOneTick = useExamSessionStore.getState().timeRemaining;
    expect(timeAfterOneTick).toBe(99);

    unmount();

    // Advance timers — store should NOT change after unmount
    act(() => { vi.advanceTimersByTime(5000); });
    expect(useExamSessionStore.getState().timeRemaining).toBe(timeAfterOneTick);
  });
});
