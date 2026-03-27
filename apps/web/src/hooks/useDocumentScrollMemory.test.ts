/**
 * useDocumentScrollMemory hook tests
 *
 * Verifies:
 *  1. Returns isReturning=false when no saved data
 *  2. Returns isReturning=true with saved scroll position
 *  3. Ignores saved position <=50
 *  4. Removes expired data (>30 days)
 *  5. saveScrollPosition debounces writes to localStorage
 *  6. Handles localStorage.getItem errors gracefully
 *  7. Handles localStorage.setItem errors gracefully
 *  8. Cleans up debounce timer on unmount (memory safety)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentScrollMemory } from './useDocumentScrollMemory';

const KEY_PREFIX = 'edusphere-scroll-';
const CONTENT_ID = 'test-doc-123';

describe('useDocumentScrollMemory', () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let removeItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns isReturning=false when no saved data', () => {
    getItemSpy.mockReturnValue(null);
    const { result } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );
    expect(result.current.isReturning).toBe(false);
    expect(result.current.savedScrollY).toBe(0);
  });

  it('returns isReturning=true with saved scroll position', () => {
    const saved = { scrollY: 500, savedAt: Date.now() };
    getItemSpy.mockReturnValue(JSON.stringify(saved));

    const { result } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );
    expect(result.current.isReturning).toBe(true);
    expect(result.current.savedScrollY).toBe(500);
  });

  it('ignores saved position <=50 (nearly-top)', () => {
    const saved = { scrollY: 30, savedAt: Date.now() };
    getItemSpy.mockReturnValue(JSON.stringify(saved));

    const { result } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );
    expect(result.current.isReturning).toBe(false);
    expect(result.current.savedScrollY).toBe(0);
  });

  it('removes expired data older than 30 days', () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const saved = { scrollY: 500, savedAt: thirtyOneDaysAgo };
    getItemSpy.mockReturnValue(JSON.stringify(saved));

    const { result } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );
    expect(result.current.isReturning).toBe(false);
    expect(removeItemSpy).toHaveBeenCalledWith(
      `${KEY_PREFIX}${CONTENT_ID}`
    );
  });

  it('saveScrollPosition debounces writes to localStorage', () => {
    getItemSpy.mockReturnValue(null);
    const { result } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );

    act(() => {
      result.current.saveScrollPosition(100);
      result.current.saveScrollPosition(200);
      result.current.saveScrollPosition(300);
    });

    // Not written yet (debounce 500ms)
    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only the last value should be saved
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const writtenValue = JSON.parse(
      setItemSpy.mock.calls[0]![1] as string
    );
    expect(writtenValue.scrollY).toBe(300);
  });

  it('handles localStorage.getItem errors gracefully', () => {
    getItemSpy.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const { result } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );
    expect(result.current.isReturning).toBe(false);
    expect(result.current.savedScrollY).toBe(0);
  });

  it('handles localStorage.setItem errors gracefully', () => {
    getItemSpy.mockReturnValue(null);
    setItemSpy.mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });

    const { result } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );

    act(() => {
      result.current.saveScrollPosition(500);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should not throw
    expect(result.current.isReturning).toBe(false);
  });

  it('cleans up debounce timer on unmount', () => {
    getItemSpy.mockReturnValue(null);
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { result, unmount } = renderHook(() =>
      useDocumentScrollMemory(CONTENT_ID)
    );

    act(() => {
      result.current.saveScrollPosition(500);
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
