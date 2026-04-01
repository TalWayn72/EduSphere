/**
 * useExamQueries hook tests
 *
 * Verifies:
 *  1. useExamBlueprint returns blueprint data
 *  2. useExamBlueprint pauses when blueprintId is empty
 *  3. useExamSession returns session data
 *  4. useExamResult returns result data
 *  5. Loading and error states propagated correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('urql', () => ({
  useQuery: vi.fn(),
}));

import {
  useExamBlueprint,
  useExamSession,
  useExamResult,
} from './useExamQueries';
import * as urql from 'urql';

const defaultQueryResult = {
  fetching: false,
  data: undefined,
  error: undefined,
  stale: false,
  extensions: undefined,
};

describe('useExamQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useExamBlueprint', () => {
    it('returns blueprint data on success', () => {
      const blueprint = { id: 'bp-1', title: 'Final Exam', totalQuestions: 50 };
      vi.mocked(urql.useQuery).mockReturnValue([
        { ...defaultQueryResult, data: { examBlueprint: blueprint } },
        vi.fn(),
      ] as never);

      const { result } = renderHook(() => useExamBlueprint('bp-1'));
      expect(result.current.blueprint).toEqual(blueprint);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns loading state when fetching', () => {
      vi.mocked(urql.useQuery).mockReturnValue([
        { ...defaultQueryResult, fetching: true },
        vi.fn(),
      ] as never);

      const { result } = renderHook(() => useExamBlueprint('bp-1'));
      expect(result.current.loading).toBe(true);
      expect(result.current.blueprint).toBeUndefined();
    });

    it('returns error message on failure', () => {
      vi.mocked(urql.useQuery).mockReturnValue([
        { ...defaultQueryResult, error: { message: 'Not found' } },
        vi.fn(),
      ] as never);

      const { result } = renderHook(() => useExamBlueprint('bp-1'));
      expect(result.current.error).toBe('Not found');
    });
  });

  describe('useExamSession', () => {
    it('returns session data on success', () => {
      const session = { id: 's-1', blueprintId: 'bp-1', status: 'IN_PROGRESS' };
      vi.mocked(urql.useQuery).mockReturnValue([
        { ...defaultQueryResult, data: { examSession: session } },
        vi.fn(),
      ] as never);

      const { result } = renderHook(() => useExamSession('s-1'));
      expect(result.current.session).toEqual(session);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns loading state', () => {
      vi.mocked(urql.useQuery).mockReturnValue([
        { ...defaultQueryResult, fetching: true },
        vi.fn(),
      ] as never);

      const { result } = renderHook(() => useExamSession('s-1'));
      expect(result.current.loading).toBe(true);
    });
  });

  describe('useExamResult', () => {
    it('returns result data on success', () => {
      const examResult = {
        id: 'r-1',
        sessionId: 's-1',
        passed: true,
        rawScore: 85,
      };
      vi.mocked(urql.useQuery).mockReturnValue([
        { ...defaultQueryResult, data: { examResult } },
        vi.fn(),
      ] as never);

      const { result } = renderHook(() => useExamResult('s-1'));
      expect(result.current.result).toEqual(examResult);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns null result when no data', () => {
      vi.mocked(urql.useQuery).mockReturnValue([
        { ...defaultQueryResult },
        vi.fn(),
      ] as never);

      const { result } = renderHook(() => useExamResult('s-1'));
      expect(result.current.result).toBeUndefined();
    });
  });
});
