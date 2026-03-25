/**
 * useMarketplace hook tests
 *
 * Verifies:
 *  1. Returns default empty state
 *  2. isLoading defaults to false
 *  3. totalCount defaults to 0
 *  4. licenseCourse is callable without errors
 *  5. categories defaults to empty array
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMarketplace } from './useMarketplace';

describe('useMarketplace', () => {
  it('returns empty listings by default', () => {
    const { result } = renderHook(() => useMarketplace());
    expect(result.current.listings).toEqual([]);
  });

  it('returns isLoading as false', () => {
    const { result } = renderHook(() => useMarketplace());
    expect(result.current.isLoading).toBe(false);
  });

  it('returns totalCount as 0', () => {
    const { result } = renderHook(() => useMarketplace());
    expect(result.current.totalCount).toBe(0);
  });

  it('returns empty categories', () => {
    const { result } = renderHook(() => useMarketplace());
    expect(result.current.categories).toEqual([]);
  });

  it('licenseCourse is a callable function', () => {
    const { result } = renderHook(() => useMarketplace());
    expect(typeof result.current.licenseCourse).toBe('function');
    expect(() => result.current.licenseCourse('listing-1')).not.toThrow();
  });
});
