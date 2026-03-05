import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnnounce } from './useAnnounce';

describe('useAnnounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Remove any live regions left by previous tests
    document.getElementById('aria-live-polite')?.remove();
    document.getElementById('aria-live-assertive')?.remove();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a stable announce function', () => {
    const { result } = renderHook(() => useAnnounce());
    expect(typeof result.current).toBe('function');
  });

  it('creates a polite live region on first call', () => {
    const { result } = renderHook(() => useAnnounce());
    act(() => {
      result.current('Hello world');
    });
    const region = document.getElementById('aria-live-polite');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('polite');
  });

  it('sets message text after 50ms debounce', () => {
    const { result } = renderHook(() => useAnnounce());
    act(() => {
      result.current('Test message');
      vi.advanceTimersByTime(50);
    });
    expect(document.getElementById('aria-live-polite')?.textContent).toBe('Test message');
  });

  it('creates an assertive live region when politeness is assertive', () => {
    const { result } = renderHook(() => useAnnounce());
    act(() => {
      result.current('Urgent!', 'assertive');
      vi.advanceTimersByTime(50);
    });
    const region = document.getElementById('aria-live-assertive');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe('Urgent!');
  });

  it('clears timeout on unmount (no memory leak)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useAnnounce());
    act(() => {
      result.current('Will be cleared');
    });
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
