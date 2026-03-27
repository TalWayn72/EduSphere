/**
 * useSlugCheck hook tests
 *
 * Verifies:
 *  1. Returns isAvailable=true, isChecking=false, suggestions=[] for empty slug
 *  2. Sets isChecking=true when slug provided
 *  3. Resolves to isAvailable=true after debounce timeout
 *  4. Cleans up timeout on unmount (memory safety)
 *  5. Resets when slug changes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlugCheck } from './useSlugCheck';

describe('useSlugCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns defaults for empty slug', () => {
    const { result } = renderHook(() => useSlugCheck(''));
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isChecking).toBe(false);
    expect(result.current.suggestions).toEqual([]);
  });

  it('sets isChecking=true when slug is provided', () => {
    const { result } = renderHook(() => useSlugCheck('my-org'));
    expect(result.current.isChecking).toBe(true);
  });

  it('resolves to isAvailable=true after timeout', () => {
    const { result } = renderHook(() => useSlugCheck('my-org'));
    expect(result.current.isChecking).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.isAvailable).toBe(true);
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = renderHook(() => useSlugCheck('my-org'));
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('resets checking when slug changes', () => {
    const { result, rerender } = renderHook(
      ({ slug }: { slug: string }) => useSlugCheck(slug),
      { initialProps: { slug: 'first' } }
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isChecking).toBe(false);

    rerender({ slug: 'second' });
    expect(result.current.isChecking).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isChecking).toBe(false);
  });
});
