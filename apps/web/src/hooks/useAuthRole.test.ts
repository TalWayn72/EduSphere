/**
 * useAuthRole hook tests
 *
 * Verifies:
 *  1. Returns user role when authenticated
 *  2. Returns null when no user (unauthenticated)
 *  3. Returns null when user has no role field
 *  4. Re-evaluates on 'keycloak-late-auth' event (reactivity)
 *  5. Re-evaluates on 'storage' event (DEV_MODE reactivity)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { useAuthRole } from './useAuthRole';
import * as auth from '@/lib/auth';

describe('useAuthRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the user role when authenticated', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue({
      id: 'u1',
      email: 'test@example.com',
      role: 'INSTRUCTOR',
      tenantId: 't1',
    } as ReturnType<typeof auth.getCurrentUser>);

    const { result } = renderHook(() => useAuthRole());
    expect(result.current).toBe('INSTRUCTOR');
  });

  it('returns null when getCurrentUser returns null', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(null);

    const { result } = renderHook(() => useAuthRole());
    expect(result.current).toBeNull();
  });

  it('returns null when user has no role property', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue({
      id: 'u1',
      email: 'test@example.com',
    } as ReturnType<typeof auth.getCurrentUser>);

    const { result } = renderHook(() => useAuthRole());
    expect(result.current).toBeNull();
  });

  it('re-evaluates role on keycloak-late-auth event', () => {
    // Start unauthenticated
    vi.mocked(auth.getCurrentUser).mockReturnValue(null);
    const { result } = renderHook(() => useAuthRole());
    expect(result.current).toBeNull();

    // Auth completes after mount
    vi.mocked(auth.getCurrentUser).mockReturnValue({
      id: 'u1',
      email: 'instructor@example.com',
      role: 'INSTRUCTOR',
      tenantId: 't1',
    } as ReturnType<typeof auth.getCurrentUser>);

    act(() => {
      window.dispatchEvent(new Event('keycloak-late-auth'));
    });

    expect(result.current).toBe('INSTRUCTOR');
  });

  it('re-evaluates role on storage event (DEV_MODE login)', () => {
    // Start unauthenticated
    vi.mocked(auth.getCurrentUser).mockReturnValue(null);
    const { result } = renderHook(() => useAuthRole());
    expect(result.current).toBeNull();

    // Dev login sets sessionStorage, triggering a storage event
    vi.mocked(auth.getCurrentUser).mockReturnValue({
      id: 'u2',
      email: 'admin@example.com',
      role: 'SUPER_ADMIN',
      tenantId: 't1',
    } as ReturnType<typeof auth.getCurrentUser>);

    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current).toBe('SUPER_ADMIN');
  });

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    vi.mocked(auth.getCurrentUser).mockReturnValue(null);
    const { unmount } = renderHook(() => useAuthRole());

    unmount();

    const addedEvents = addSpy.mock.calls.map(([event]) => event);
    const removedEvents = removeSpy.mock.calls.map(([event]) => event);

    expect(addedEvents).toContain('keycloak-late-auth');
    expect(addedEvents).toContain('storage');
    expect(removedEvents).toContain('keycloak-late-auth');
    expect(removedEvents).toContain('storage');
  });
});
