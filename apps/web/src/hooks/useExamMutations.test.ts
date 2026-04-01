/**
 * useExamMutations hook tests
 *
 * Verifies:
 *  1. useStartExamSession calls mutation and returns data
 *  2. useStartExamSession handles errors
 *  3. useSubmitExamAnswer calls mutation with correct variables
 *  4. useFlagExamQuestion calls mutation
 *  5. useSubmitExam calls mutation and returns result
 *  6. All hooks manage loading/error state correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('urql', () => ({
  useMutation: vi.fn(),
}));

import {
  useStartExamSession,
  useSubmitExamAnswer,
  useFlagExamQuestion,
  useSubmitExam,
} from './useExamMutations';
import * as urql from 'urql';

const defaultMutationState = {
  fetching: false,
  data: undefined,
  error: undefined,
  stale: false,
  extensions: undefined,
};

describe('useExamMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useStartExamSession', () => {
    it('returns session data on success', async () => {
      const sessionData = { id: 's-1', status: 'IN_PROGRESS' };
      const mockExecute = vi.fn().mockResolvedValue({
        data: { startExamSession: sessionData },
        error: undefined,
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useStartExamSession());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();

      let returned: unknown;
      await act(async () => {
        returned = await result.current.startSession('bp-1');
      });

      expect(returned).toEqual(sessionData);
      expect(mockExecute).toHaveBeenCalledWith({ blueprintId: 'bp-1' });
    });

    it('sets error on mutation failure', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        data: undefined,
        error: { message: 'Server error' },
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useStartExamSession());

      await act(async () => {
        const returned = await result.current.startSession('bp-1');
        expect(returned).toBeNull();
      });

      expect(result.current.error).toBe('Failed to start exam session.');
    });

    it('handles thrown errors', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useStartExamSession());

      await act(async () => {
        const returned = await result.current.startSession('bp-1');
        expect(returned).toBeNull();
      });

      expect(result.current.error).toBe('Failed to start exam session.');
    });
  });

  describe('useSubmitExamAnswer', () => {
    it('submits answer and returns data', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        data: { submitExamAnswer: true },
        error: undefined,
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useSubmitExamAnswer());

      await act(async () => {
        await result.current.submitAnswer('s-1', 'item-1', { selected: 'A' });
      });

      expect(mockExecute).toHaveBeenCalledWith({
        sessionId: 's-1',
        itemId: 'item-1',
        answer: { selected: 'A' },
      });
    });

    it('sets error on failure', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        data: undefined,
        error: { message: 'Failed' },
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useSubmitExamAnswer());

      await act(async () => {
        const returned = await result.current.submitAnswer('s-1', 'item-1', {});
        expect(returned).toBeNull();
      });

      expect(result.current.error).toBe('Failed to submit answer.');
    });
  });

  describe('useFlagExamQuestion', () => {
    it('flags a question successfully', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        data: { flagExamQuestion: true },
        error: undefined,
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useFlagExamQuestion());

      await act(async () => {
        await result.current.flagQuestion('s-1', 'item-2');
      });

      expect(mockExecute).toHaveBeenCalledWith({
        sessionId: 's-1',
        itemId: 'item-2',
      });
    });

    it('sets error on failure', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        data: undefined,
        error: { message: 'Flag failed' },
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useFlagExamQuestion());

      await act(async () => {
        await result.current.flagQuestion('s-1', 'item-2');
      });

      expect(result.current.error).toBe('Failed to flag question.');
    });
  });

  describe('useSubmitExam', () => {
    it('submits exam and returns result', async () => {
      const examResult = { id: 'r-1', passed: true, rawScore: 90 };
      const mockExecute = vi.fn().mockResolvedValue({
        data: { submitExam: examResult },
        error: undefined,
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useSubmitExam());

      let returned: unknown;
      await act(async () => {
        returned = await result.current.submitExam('s-1');
      });

      expect(returned).toEqual(examResult);
      expect(mockExecute).toHaveBeenCalledWith({ sessionId: 's-1' });
    });

    it('sets error on failure', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        data: undefined,
        error: { message: 'Submit failed' },
      });
      vi.mocked(urql.useMutation).mockReturnValue([
        defaultMutationState,
        mockExecute,
      ] as never);

      const { result } = renderHook(() => useSubmitExam());

      await act(async () => {
        const returned = await result.current.submitExam('s-1');
        expect(returned).toBeNull();
      });

      expect(result.current.error).toBe('Failed to submit exam.');
    });
  });
});
