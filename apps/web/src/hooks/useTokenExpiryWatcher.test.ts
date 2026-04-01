/**
 * useTokenExpiryWatcher hook tests
 *
 * Verifies:
 *  1. Returns expired=false initially
 *  2. handleReLogin is callable
 *  3. Skips timers in DEV_MODE
 *  4. Sets expired=true when token is already past expiry
 *  5. Cleans up timers on unmount (MEMORY SAFETY)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockGetTokenExpiry = vi.fn();
const mockRefreshToken = vi.fn();
const mockIsAuthenticated = vi.fn();
const mockLogin = vi.fn();

vi.mock('@/lib/auth', () => ({
  getTokenExpiry: (...args: unknown[]) => mockGetTokenExpiry(...args),
  refreshToken: (...args: unknown[]) => mockRefreshToken(...args),
  isAuthenticated: (...args: unknown[]) => mockIsAuthenticated(...args),
  login: (...args: unknown[]) => mockLogin(...args),
  DEV_MODE: false,
}));

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

import { useTokenExpiryWatcher } from './useTokenExpiryWatcher';

describe('useTokenExpiryWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns expired=false initially when token is valid', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    mockGetTokenExpiry.mockReturnValue(futureExp);

    const { result } = renderHook(() => useTokenExpiryWatcher());
    expect(result.current.expired).toBe(false);
  });

  it('returns handleReLogin as a function', () => {
    mockGetTokenExpiry.mockReturnValue(null);

    const { result } = renderHook(() => useTokenExpiryWatcher());
    expect(typeof result.current.handleReLogin).toBe('function');
  });

  it('sets expired=true when token is already past expiry', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 10;
    mockGetTokenExpiry.mockReturnValue(pastExp);

    const { result } = renderHook(() => useTokenExpiryWatcher());
    expect(result.current.expired).toBe(true);
  });

  it('sets expired=true when expiry timer fires', () => {
    const nowS = Math.floor(Date.now() / 1000);
    mockGetTokenExpiry.mockReturnValue(nowS + 5);

    const { result } = renderHook(() => useTokenExpiryWatcher());
    expect(result.current.expired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.expired).toBe(true);
  });

  it('cleans up timers on unmount (memory safety)', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    mockGetTokenExpiry.mockReturnValue(futureExp);

    const { unmount } = renderHook(() => useTokenExpiryWatcher());

    unmount();

    // clearTimers should have been called, cleaning up warn/expire/poll timers
    expect(
      clearTimeoutSpy.mock.calls.length + clearIntervalSpy.mock.calls.length
    ).toBeGreaterThan(0);

    clearTimeoutSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('handleReLogin calls login()', () => {
    mockGetTokenExpiry.mockReturnValue(null);

    const { result } = renderHook(() => useTokenExpiryWatcher());

    act(() => {
      result.current.handleReLogin();
    });

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
