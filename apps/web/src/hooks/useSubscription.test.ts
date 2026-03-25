/**
 * useSubscription hook tests
 *
 * Verifies:
 *  1. Returns default status 'active'
 *  2. Returns default daysRemaining 0
 *  3. Returns default planName 'FREE'
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSubscription } from './useSubscription';

describe('useSubscription', () => {
  it('returns active status by default', () => {
    const { result } = renderHook(() => useSubscription());
    expect(result.current.status).toBe('active');
  });

  it('returns daysRemaining as 0', () => {
    const { result } = renderHook(() => useSubscription());
    expect(result.current.daysRemaining).toBe(0);
  });

  it('returns planName as FREE', () => {
    const { result } = renderHook(() => useSubscription());
    expect(result.current.planName).toBe('FREE');
  });
});
