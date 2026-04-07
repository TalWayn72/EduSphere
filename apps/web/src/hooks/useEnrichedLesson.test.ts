/**
 * Tests for useEnrichedLesson hook — polling behaviour.
 *
 * Covers:
 *  1. Returns null data when no lessonId
 *  2. Returns enriched lesson data when query succeeds
 *  3. Does NOT poll when pollWhileProcessing is false (default)
 *  4. Starts polling when status is EXTRACTING_TRANSCRIPT
 *  5. Stops polling when status becomes READY
 *  6. Cleans up interval on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mock urql ────────────────────────────────────────────────────────────────

const mockReexecute = vi.fn();
let mockQueryResult: {
  data?: { enrichedLesson: { enrichmentStatus: string } | null };
  fetching: boolean;
  error?: { message: string };
} = { fetching: false };

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [mockQueryResult, mockReexecute]),
}));

vi.mock('@/lib/graphql/enriched-lesson.queries', () => ({
  ENRICHED_LESSON_QUERY: 'ENRICHED_LESSON_QUERY',
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useEnrichedLesson } from './useEnrichedLesson';

describe('useEnrichedLesson', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReexecute.mockClear();
    mockQueryResult = { fetching: false };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns null data when query has no data', () => {
    mockQueryResult = { fetching: false };
    const { result } = renderHook(() => useEnrichedLesson('lesson-1'));
    expect(result.current.data).toBeNull();
    expect(result.current.fetching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns enriched lesson data when query succeeds', () => {
    mockQueryResult = {
      fetching: false,
      data: { enrichedLesson: { enrichmentStatus: 'READY' } as never },
    };
    const { result } = renderHook(() => useEnrichedLesson('lesson-1'));
    expect(result.current.data).toEqual({ enrichmentStatus: 'READY' });
  });

  it('does NOT poll when pollWhileProcessing is false (default)', () => {
    mockQueryResult = {
      fetching: false,
      data: {
        enrichedLesson: { enrichmentStatus: 'EXTRACTING_TRANSCRIPT' } as never,
      },
    };
    renderHook(() => useEnrichedLesson('lesson-1'));

    act(() => {
      vi.advanceTimersByTime(9000);
    });

    // reexecute called only once from refetch (not from polling)
    expect(mockReexecute).not.toHaveBeenCalledWith({
      requestPolicy: 'network-only',
    });
  });

  it('starts polling when status is EXTRACTING_TRANSCRIPT and pollWhileProcessing=true', () => {
    mockQueryResult = {
      fetching: false,
      data: {
        enrichedLesson: { enrichmentStatus: 'EXTRACTING_TRANSCRIPT' } as never,
      },
    };
    renderHook(() =>
      useEnrichedLesson('lesson-1', { pollWhileProcessing: true })
    );

    act(() => {
      vi.advanceTimersByTime(6100);
    });

    expect(mockReexecute).toHaveBeenCalledWith({
      requestPolicy: 'network-only',
    });
    expect(mockReexecute.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('stops polling when status becomes READY', () => {
    mockQueryResult = {
      fetching: false,
      data: {
        enrichedLesson: { enrichmentStatus: 'EXTRACTING_TRANSCRIPT' } as never,
      },
    };
    const { rerender } = renderHook(() =>
      useEnrichedLesson('lesson-1', { pollWhileProcessing: true })
    );

    act(() => {
      vi.advanceTimersByTime(3100);
    });

    const callsAfterStart = mockReexecute.mock.calls.length;
    expect(callsAfterStart).toBeGreaterThanOrEqual(1);

    // Status becomes READY
    mockQueryResult = {
      fetching: false,
      data: { enrichedLesson: { enrichmentStatus: 'READY' } as never },
    };
    rerender();

    act(() => {
      vi.advanceTimersByTime(9000);
    });

    // No additional polling calls after READY
    expect(mockReexecute.mock.calls.length).toBe(callsAfterStart);
  });

  it('cleans up interval on unmount', () => {
    mockQueryResult = {
      fetching: false,
      data: {
        enrichedLesson: { enrichmentStatus: 'RUNNING_NER' } as never,
      },
    };
    const { unmount } = renderHook(() =>
      useEnrichedLesson('lesson-1', { pollWhileProcessing: true })
    );

    act(() => {
      vi.advanceTimersByTime(3100);
    });

    const callsBeforeUnmount = mockReexecute.mock.calls.length;
    unmount();

    act(() => {
      vi.advanceTimersByTime(9000);
    });

    // No more calls after unmount
    expect(mockReexecute.mock.calls.length).toBe(callsBeforeUnmount);
  });
});
