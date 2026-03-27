/**
 * useOrgAnalytics hook tests
 *
 * Verifies:
 *  1. Returns default state (null kpis, empty timeSeries, isLoading=true)
 *  2. dateRange has start and end as Date objects
 *  3. setDateRange updates dateRange
 *  4. exportCsv is callable without errors
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrgAnalytics } from './useOrgAnalytics';

describe('useOrgAnalytics', () => {
  it('returns default state', () => {
    const { result } = renderHook(() => useOrgAnalytics());
    expect(result.current.kpis).toBeNull();
    expect(result.current.timeSeriesData).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('dateRange contains Date objects for start and end', () => {
    const { result } = renderHook(() => useOrgAnalytics());
    expect(result.current.dateRange.start).toBeInstanceOf(Date);
    expect(result.current.dateRange.end).toBeInstanceOf(Date);
  });

  it('setDateRange updates the dateRange', () => {
    const { result } = renderHook(() => useOrgAnalytics());
    const newRange = {
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    };
    act(() => {
      result.current.setDateRange(newRange);
    });
    expect(result.current.dateRange.start.toISOString()).toBe(
      '2026-01-01T00:00:00.000Z'
    );
    expect(result.current.dateRange.end.toISOString()).toBe(
      '2026-01-31T00:00:00.000Z'
    );
  });

  it('exportCsv is a callable function that does not throw', () => {
    const { result } = renderHook(() => useOrgAnalytics());
    expect(typeof result.current.exportCsv).toBe('function');
    expect(() => result.current.exportCsv()).not.toThrow();
  });
});
