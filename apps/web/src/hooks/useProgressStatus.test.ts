// @vitest-environment jsdom
/**
 * useProgressStatus hook tests
 *
 * Verifies:
 *  1. Returns first message when active
 *  2. Cycles to next message after interval
 *  3. Wraps around to first message after reaching the end
 *  4. Resets index to 0 when active becomes false
 *  5. Jumps to phaseIndex when provided
 *  6. Cleans up interval on unmount (memory safety)
 *  7. Does not cycle when active is false
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgressStatus } from './useProgressStatus';

// react-i18next is mocked globally in src/test/setup.ts
// t(key) returns the key itself when not found in translation files

const MESSAGES = ['msg.one', 'msg.two', 'msg.three'];

describe('useProgressStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('returns the first message key when active', () => {
    const { result } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES, active: true })
    );
    expect(result.current.currentMessage).toBe('msg.one');
    expect(result.current.currentIndex).toBe(0);
  });

  it('cycles to the next message after the interval fires', () => {
    const { result } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES, active: true, interval: 1000 })
    );
    expect(result.current.currentIndex).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it('wraps around to the first message after reaching the end', () => {
    const { result } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES, active: true, interval: 1000 })
    );

    act(() => {
      vi.advanceTimersByTime(3000); // 3 ticks → wrap back to 0
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('resets index to 0 when active becomes false', () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useProgressStatus({ messages: MESSAGES, active, interval: 1000 }),
      { initialProps: { active: true } }
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentIndex).toBe(1);

    rerender({ active: false });

    expect(result.current.currentIndex).toBe(0);
  });

  it('jumps to phaseIndex immediately when provided', () => {
    const { result } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES, active: true, phaseIndex: 2 })
    );
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.currentMessage).toBe('msg.three');
  });

  it('does not auto-cycle when phaseIndex controls the index', () => {
    const { result } = renderHook(() =>
      useProgressStatus({
        messages: MESSAGES,
        active: true,
        interval: 1000,
        phaseIndex: 1,
      })
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Index stays at phaseIndex — no auto-cycling
    expect(result.current.currentIndex).toBe(1);
  });

  it('does not advance the index when active is false', () => {
    const { result } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES, active: false, interval: 1000 })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { unmount } = renderHook(() =>
      useProgressStatus({ messages: MESSAGES, active: true, interval: 1000 })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
