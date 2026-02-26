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
});
