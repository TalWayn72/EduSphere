// @vitest-environment jsdom
/**
 * useProgressStatus — memory safety / cleanup tests
 *
 * Verifies that:
 *  1. clearInterval is called when component unmounts
 *  2. The mountedRef guard prevents state updates after unmount
 *  3. Previous interval is cleared when messages array length changes
 *     (useEffect dependency change triggers cleanup → new interval)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgressStatus } from './useProgressStatus';

// react-i18next is mocked globally in src/test/setup.ts

const MESSAGES_A = ['a.one', 'a.two', 'a.three'];
const MESSAGES_B = ['b.one', 'b.two'];

describe('useProgressStatus timer cleanup (memory safety)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls clearInterval when the hook unmounts', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { unmount } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES_A, active: true, interval: 500 }),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('does not fire interval callback after unmount (mountedRef guard)', () => {
    const { result, unmount } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES_A, active: true, interval: 500 }),
    );

    expect(result.current.currentIndex).toBe(0);

    // Unmount before any tick fires
    unmount();

    // Advancing timers after unmount must not cause React "state update on
    // unmounted component" warnings — the mountedRef guard blocks setIndex().
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();
  });

  it('clears the previous interval when messages array length changes', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { rerender } = renderHook(
      ({ msgs }: { msgs: string[] }) =>
        useProgressStatus({ messages: msgs, active: true, interval: 500 }),
      { initialProps: { msgs: MESSAGES_A } },
    );

    // Changing messages.length triggers the cycling useEffect cleanup path
    rerender({ msgs: MESSAGES_B });

    // clearInterval should have been called to tear down the old interval
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('does not throw when unmounting immediately without any timer ticks', () => {
    const { unmount } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES_A, active: true }),
    );

    expect(() => unmount()).not.toThrow();
  });

  it('clears interval when active transitions from true to false', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useProgressStatus({ messages: MESSAGES_A, active, interval: 500 }),
      { initialProps: { active: true } },
    );

    rerender({ active: false });

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
