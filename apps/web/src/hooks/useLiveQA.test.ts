/**
 * useLiveQA hook tests
 *
 * Covers:
 *  1. sortedQuestions ordered by upvotes DESC then createdAt ASC
 *  2. Subscription upserts — updates existing question
 *  3. Subscription appends new question
 *  4. askQuestion calls execute mutation
 *  5. upvoteQuestion optimistic update
 *  6. fetching forwarded from query
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/live-chat.queries', () => ({
  LIVE_QA_QUESTIONS_QUERY: 'LIVE_QA_QUESTIONS_QUERY',
  ASK_LIVE_QUESTION_MUTATION: 'ASK',
  UPVOTE_LIVE_QUESTION_MUTATION: 'UPVOTE',
  ANSWER_LIVE_QUESTION_MUTATION: 'ANSWER',
  DISMISS_LIVE_QUESTION_MUTATION: 'DISMISS',
  LIVE_QA_UPDATED_SUB: 'QA_UPDATED_SUB',
}));

import * as urql from 'urql';
import { useLiveQA } from './useLiveQA';
import type { LiveQAQuestion } from '@/types/live-session.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQuestion(
  id: string,
  upvotes: number,
  createdAt = '2026-01-01T10:00:00Z'
): LiveQAQuestion {
  return {
    id,
    sessionId: 'sess-1',
    userId: 'user-1',
    question: `Question ${id}`,
    upvotes,
    status: 'PENDING',
    answer: null,
    createdAt,
  };
}

function setupMocks({
  initialQuestions = [] as LiveQAQuestion[],
  queryFetching = false,
  subQuestion = null as LiveQAQuestion | null,
  upvoteMutFn = vi.fn().mockResolvedValue({ data: null }),
} = {}) {
  const executeAsk = vi.fn().mockResolvedValue({ data: null });
  const executeUpvote = upvoteMutFn;
  const executeAnswer = vi.fn().mockResolvedValue({ data: null });
  const executeDismiss = vi.fn().mockResolvedValue({ data: null });

  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { liveQAQuestions: initialQuestions },
      fetching: queryFetching,
      error: undefined,
      stale: false,
    },
    vi.fn(),
  ] as never);

  vi.mocked(urql.useMutation)
    .mockReturnValue([{} as never, vi.fn() as never])
    .mockReturnValueOnce([{} as never, executeAsk as never])
    .mockReturnValueOnce([{} as never, executeUpvote as never])
    .mockReturnValueOnce([{} as never, executeAnswer as never])
    .mockReturnValueOnce([{} as never, executeDismiss as never]);

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: { liveQAUpdated: subQuestion }, fetching: false },
    vi.fn(),
  ] as never);

  return { executeAsk, executeUpvote, executeAnswer, executeDismiss };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLiveQA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sortedQuestions ordered by upvotes descending', async () => {
    const qs = [
      makeQuestion('q1', 2),
      makeQuestion('q2', 10),
      makeQuestion('q3', 5),
    ];
    setupMocks({ initialQuestions: qs });
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await waitFor(() => {
      expect(result.current.sortedQuestions).toHaveLength(3);
    });

    expect(result.current.sortedQuestions.map((q) => q.id)).toEqual([
      'q2',
      'q3',
      'q1',
    ]);
  });

  it('sortedQuestions with equal upvotes ordered by createdAt ascending', async () => {
    const qs = [
      makeQuestion('q1', 5, '2026-01-01T10:02:00Z'),
      makeQuestion('q2', 5, '2026-01-01T10:00:00Z'),
    ];
    setupMocks({ initialQuestions: qs });
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await waitFor(() => {
      expect(result.current.sortedQuestions).toHaveLength(2);
    });

    expect(result.current.sortedQuestions[0]!.id).toBe('q2');
    expect(result.current.sortedQuestions[1]!.id).toBe('q1');
  });

  it('subscription updates existing question (upsert)', async () => {
    const initial = [makeQuestion('q1', 5)];
    const updated = { ...makeQuestion('q1', 15), question: 'Updated question' };
    setupMocks({ initialQuestions: initial, subQuestion: updated });
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await waitFor(() => {
      const q = result.current.questions.find((q) => q.id === 'q1');
      expect(q?.upvotes).toBe(15);
    });

    expect(result.current.questions).toHaveLength(1);
    expect(result.current.questions[0]!.question).toBe('Updated question');
  });

  it('subscription appends new question when id not in list', async () => {
    const initial = [makeQuestion('q1', 5)];
    const newQ = makeQuestion('q2', 1);
    setupMocks({ initialQuestions: initial, subQuestion: newQ });
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await waitFor(() => {
      expect(result.current.questions).toHaveLength(2);
    });
  });

  it('forwards fetching state from query', () => {
    setupMocks({ queryFetching: true });
    const { result } = renderHook(() => useLiveQA('sess-1'));
    expect(result.current.fetching).toBe(true);
  });

  it('askQuestion calls mutation with sessionId and question text', async () => {
    const { executeAsk } = setupMocks();
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await act(async () => {
      await result.current.askQuestion('What is GraphQL?');
    });

    expect(executeAsk).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      question: 'What is GraphQL?',
    });
  });

  it('upvoteQuestion applies optimistic increment', async () => {
    const initial = [makeQuestion('q1', 3)];
    setupMocks({ initialQuestions: initial });
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await waitFor(() => {
      expect(result.current.questions).toHaveLength(1);
    });

    act(() => {
      void result.current.upvoteQuestion('q1');
    });

    await waitFor(() => {
      const q = result.current.questions.find((q) => q.id === 'q1');
      expect(q?.upvotes).toBe(4);
    });
  });

  it('upvoteQuestion reverts optimistic update on error', async () => {
    const initial = [makeQuestion('q1', 3)];
    const failUpvote = vi
      .fn()
      .mockResolvedValue({ error: new Error('failed') });
    setupMocks({ initialQuestions: initial, upvoteMutFn: failUpvote });
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await waitFor(() => {
      expect(result.current.questions).toHaveLength(1);
    });

    await act(async () => {
      await result.current.upvoteQuestion('q1');
    });

    await waitFor(() => {
      const q = result.current.questions.find((q) => q.id === 'q1');
      expect(q?.upvotes).toBe(3);
    });
  });

  it('handles null subscription data gracefully', async () => {
    const initial = [makeQuestion('q1', 5)];
    setupMocks({ initialQuestions: initial, subQuestion: null });
    const { result } = renderHook(() => useLiveQA('sess-1'));

    await waitFor(() => {
      expect(result.current.questions).toHaveLength(1);
    });
  });
});
