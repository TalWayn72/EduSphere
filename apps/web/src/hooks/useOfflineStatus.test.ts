/**
 * useOfflineStatus — unit tests.
 *
 * Memory safety regression: verifies event listeners are removed on unmount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineStatus } from './useOfflineStatus';

describe('useOfflineStatus', () => {
  // Set navigator.onLine to true before each test
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('returns isOnline=true when navigator.onLine is true', () => {
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('returns isOffline=true when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('switches to isOffline when offline event fires', () => {
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('switches back to isOnline when online event fires', () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current.isOffline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('updates lastOnlineAt when coming back online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useOfflineStatus());

    const before = Date.now();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    const after = Date.now();

    expect(result.current.lastOnlineAt).not.toBeNull();
    expect(result.current.lastOnlineAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.current.lastOnlineAt!.getTime()).toBeLessThanOrEqual(after);
  });

  it('removes event listeners on unmount (memory safety)', () => {
    // Spy inside the test body so clearMocks does not interfere
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOfflineStatus());

    // Capture the handlers that were registered during mount
    const addedOnline = addSpy.mock.calls.filter(([e]) => e === 'online');
    const addedOffline = addSpy.mock.calls.filter(([e]) => e === 'offline');
    expect(addedOnline.length).toBeGreaterThanOrEqual(1);
    expect(addedOffline.length).toBeGreaterThanOrEqual(1);

    unmount();

    // Verify the same handlers were passed to removeEventListener
    const removedOnline = removeSpy.mock.calls.filter(([e]) => e === 'online');
    const removedOffline = removeSpy.mock.calls.filter(([e]) => e === 'offline');
    expect(removedOnline.length).toBeGreaterThanOrEqual(1);
    expect(removedOffline.length).toBeGreaterThanOrEqual(1);

    // Verify the exact handler function is the same reference
    const onlineHandler = addedOnline[0][1];
    const offlineHandler = addedOffline[0][1];
    const removedOnlineHandler = removedOnline[0][1];
    const removedOfflineHandler = removedOffline[0][1];
    expect(removedOnlineHandler).toBe(onlineHandler);
    expect(removedOfflineHandler).toBe(offlineHandler);

    vi.restoreAllMocks();
  });
});
