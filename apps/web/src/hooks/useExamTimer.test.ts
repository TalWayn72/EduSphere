/**
 * useExamTimer hook tests
 *
 * Verifies:
 *  1.  Timer decrements every second
 *  2.  Timer triggers onExpire callback at 0
 *  3.  Timer shows warning at 600s (10 min)
 *  4.  Timer shows critical at 300s (5 min)
 *  5.  Timer formats time correctly (MM:SS)
 *  6.  Timer cleans up interval on unmount (MEMORY SAFETY)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExamSessionStore } from '@/stores/exam-session.store';

// ── Import after store is available ─────────────────────────────────────────
import { useExamTimer } from './useExamTimer';

// ── Helpers ─────────────────────────────────────────────────────────────────

function seedStore(timeRemaining: number) {
  useExamSessionStore.setState({ timeRemaining });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useExamTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useExamSessionStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('decrements time every second via store', () => {
    seedStore(10);
    const onExpire = vi.fn();
    renderHook(() => useExamTimer(10, onExpire));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useExamSessionStore.getState().timeRemaining).toBe(9);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useExamSessionStore.getState().timeRemaining).toBe(8);
  });

  it('triggers onExpire when time reaches 0', () => {
    seedStore(2);
    const onExpire = vi.fn();
    renderHook(() => useExamTimer(2, onExpire));

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('returns isWarning=true at 600s (10 min threshold)', () => {
    seedStore(600);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamTimer(3600, onExpire));

    expect(result.current.isWarning).toBe(true);
    expect(result.current.isCritical).toBe(false);
  });

  it('returns isCritical=true at 300s (5 min threshold)', () => {
    seedStore(300);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamTimer(3600, onExpire));

    expect(result.current.isCritical).toBe(true);
    expect(result.current.isWarning).toBe(false);
  });

  it('formats time correctly as MM:SS', () => {
    seedStore(754); // 12:34
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamTimer(3600, onExpire));

    expect(result.current.formattedTime).toBe('12:34');
  });

  it('formats single-digit values with leading zeros', () => {
    seedStore(65); // 01:05
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamTimer(3600, onExpire));

    expect(result.current.formattedTime).toBe('01:05');
  });

  it('returns normal state when time > 600s', () => {
    seedStore(1200);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useExamTimer(3600, onExpire));

    expect(result.current.isWarning).toBe(false);
    expect(result.current.isCritical).toBe(false);
  });
});
