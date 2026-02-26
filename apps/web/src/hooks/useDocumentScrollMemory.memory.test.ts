import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import { useDocumentScrollMemory } from '@/hooks/useDocumentScrollMemory';

describe('useDocumentScrollMemory — memory safety', () => {
  beforeEach(() => localStorageMock.clear());
  afterEach(() => vi.clearAllMocks());

  it('unmount clears debounce timer without throwing', () => {
    const { unmount } = renderHook(() => useDocumentScrollMemory('doc-1'));
    expect(() => unmount()).not.toThrow();
  });

  it('isReturning is false on first visit', () => {
    const { result } = renderHook(() => useDocumentScrollMemory('doc-1'));
    expect(result.current.isReturning).toBe(false);
  });

  it('isReturning is true when saved data exists with scrollY > 50', () => {
    localStorageMock.setItem(
      'edusphere-scroll-doc-1',
      JSON.stringify({ scrollY: 300, savedAt: Date.now() })
    );
    const { result } = renderHook(() => useDocumentScrollMemory('doc-1'));
    expect(result.current.isReturning).toBe(true);
    expect(result.current.savedScrollY).toBe(300);
  });

  it('isReturning is false when scrollY <= 50 (near top)', () => {
    localStorageMock.setItem(
      'edusphere-scroll-doc-1',
      JSON.stringify({ scrollY: 30, savedAt: Date.now() })
    );
    const { result } = renderHook(() => useDocumentScrollMemory('doc-1'));
    expect(result.current.isReturning).toBe(false);
  });

  it('saveScrollPosition writes to localStorage after debounce', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDocumentScrollMemory('doc-2'));
    act(() => {
      result.current.saveScrollPosition(500);
    });
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'edusphere-scroll-doc-2',
      expect.stringContaining('"scrollY":500')
    );
    vi.useRealTimers();
  });

  // ── Expired entry (lines 18-19) ──────────────────────────────────────────

  it('ignores and removes an expired scroll entry (> 30 days old)', () => {
    const THIRTY_ONE_DAYS = 31 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem(
      'edusphere-scroll-doc-3',
      JSON.stringify({ scrollY: 400, savedAt: Date.now() - THIRTY_ONE_DAYS })
    );
    const { result } = renderHook(() => useDocumentScrollMemory('doc-3'));
    expect(result.current.isReturning).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      'edusphere-scroll-doc-3'
    );
  });

  // ── Invalid JSON in localStorage (line 24 catch branch) ─────────────────

  it('returns isReturning:false when localStorage contains invalid JSON', () => {
    localStorageMock.getItem.mockReturnValueOnce('{bad json}');
    const { result } = renderHook(() => useDocumentScrollMemory('doc-4'));
    expect(result.current.isReturning).toBe(false);
  });

  // ── Unmount with a pending debounce timer (lines 51-52) ─────────────────

  it('clearTimeout is called on unmount when a save is in flight', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() =>
      useDocumentScrollMemory('doc-5')
    );
    act(() => {
      result.current.saveScrollPosition(700);
    });
    // Unmount BEFORE the 500ms debounce fires — debounceRef.current is non-null
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });
});
