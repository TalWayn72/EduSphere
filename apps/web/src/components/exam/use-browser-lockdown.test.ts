/**
 * useBrowserLockdown hook tests
 *
 * Verifies:
 *  1. Does nothing when disabled
 *  2. Reports TAB_SWITCH on visibility change
 *  3. Reports CLIPBOARD_ATTEMPT on copy
 *  4. Reports RIGHT_CLICK on contextmenu
 *  5. Reports KEYBOARD_SHORTCUT on blocked keys
 *  6. Cleans up all listeners on unmount (MEMORY SAFETY)
 *  7. Cleans up interval on unmount (MEMORY SAFETY)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBrowserLockdown } from './use-browser-lockdown';

describe('useBrowserLockdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestFullscreen
    document.documentElement.requestFullscreen = vi
      .fn()
      .mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not report violations when disabled', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: false, onViolation }));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onViolation).not.toHaveBeenCalled();
  });

  it('reports TAB_SWITCH on visibility change', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: true, onViolation }));

    // Simulate hidden
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onViolation).toHaveBeenCalledWith('TAB_SWITCH');

    // Reset
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  it('reports TAB_SWITCH on blur', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: true, onViolation }));

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(onViolation).toHaveBeenCalledWith('TAB_SWITCH');
  });

  it('reports CLIPBOARD_ATTEMPT on copy', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: true, onViolation }));

    act(() => {
      const e = new Event('copy', { cancelable: true });
      document.dispatchEvent(e);
    });
    expect(onViolation).toHaveBeenCalledWith('CLIPBOARD_ATTEMPT');
  });

  it('reports CLIPBOARD_ATTEMPT on paste', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: true, onViolation }));

    act(() => {
      const e = new Event('paste', { cancelable: true });
      document.dispatchEvent(e);
    });
    expect(onViolation).toHaveBeenCalledWith('CLIPBOARD_ATTEMPT');
  });

  it('reports RIGHT_CLICK on contextmenu', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: true, onViolation }));

    act(() => {
      const e = new MouseEvent('contextmenu', { cancelable: true });
      document.dispatchEvent(e);
    });
    expect(onViolation).toHaveBeenCalledWith('RIGHT_CLICK');
  });

  it('reports KEYBOARD_SHORTCUT on Ctrl+C', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: true, onViolation }));

    act(() => {
      const e = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        cancelable: true,
      });
      document.dispatchEvent(e);
    });
    expect(onViolation).toHaveBeenCalledWith('KEYBOARD_SHORTCUT');
  });

  it('reports KEYBOARD_SHORTCUT on F12', () => {
    const onViolation = vi.fn();
    renderHook(() => useBrowserLockdown({ enabled: true, onViolation }));

    act(() => {
      const e = new KeyboardEvent('keydown', { key: 'F12', cancelable: true });
      document.dispatchEvent(e);
    });
    expect(onViolation).toHaveBeenCalledWith('KEYBOARD_SHORTCUT');
  });

  it('cleans up event listeners on unmount (MEMORY SAFETY)', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const onViolation = vi.fn();
    const { unmount } = renderHook(() =>
      useBrowserLockdown({ enabled: true, onViolation })
    );

    unmount();
    // Should have removed: fullscreenchange, visibilitychange, copy, paste, cut, contextmenu, keydown
    expect(removeSpy).toHaveBeenCalledWith(
      'fullscreenchange',
      expect.any(Function)
    );
    expect(removeSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
    expect(removeSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('cleans up devtools check interval on unmount (MEMORY SAFETY)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const onViolation = vi.fn();
    const { unmount } = renderHook(() =>
      useBrowserLockdown({ enabled: true, onViolation })
    );

    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('returns isFullscreen state', () => {
    const { result } = renderHook(() =>
      useBrowserLockdown({ enabled: true, onViolation: vi.fn() })
    );
    expect(result.current.isFullscreen).toBe(false);
  });
});
