/**
 * useAuthRole hook tests
 *
 * Verifies:
 *  1. Returns user role when authenticated
 *  2. Returns null when no user (unauthenticated)
 *  3. Returns null when user has no role field
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

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
});
