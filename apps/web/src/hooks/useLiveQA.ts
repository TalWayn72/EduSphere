/**
 * useLiveQA — fetches Q&A questions and subscribes to updates.
 *
 * Exposes sortedQuestions (upvotes DESC, then createdAt ASC).
 * Optimistically increments upvotes for better UX.
 * Memory safety: subscription paused on unmount.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useSubscription } from 'urql';
import {
  LIVE_QA_QUESTIONS_QUERY,
  ASK_LIVE_QUESTION_MUTATION,
  UPVOTE_LIVE_QUESTION_MUTATION,
  ANSWER_LIVE_QUESTION_MUTATION,
  DISMISS_LIVE_QUESTION_MUTATION,
  LIVE_QA_UPDATED_SUB,
} from '@/lib/graphql/live-chat.queries';
import type { LiveQAQuestion } from '@/types/live-session.types';

// ── Local interfaces ───────────────────────────────────────────────────────────

interface LiveQAQuestionsResult {
  liveQAQuestions: LiveQAQuestion[];
}

interface LiveQAUpdatedSubResult {
  liveQAUpdated: LiveQAQuestion | null;
}

export interface UseLiveQAReturn {
  questions: LiveQAQuestion[];
  sortedQuestions: LiveQAQuestion[];
  fetching: boolean;
  askQuestion(question: string): Promise<void>;
  upvoteQuestion(questionId: string): Promise<void>;
  answerQuestion(questionId: string, answer: string): Promise<void>;
  dismissQuestion(questionId: string): Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveQA(sessionId: string): UseLiveQAReturn {
  const [paused, setPaused] = useState(false);
  const [questions, setQuestions] = useState<LiveQAQuestion[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    setPaused(false);
    return () => { setPaused(true); };
  }, []);

  const [queryResult] = useQuery<LiveQAQuestionsResult>({
    query: LIVE_QA_QUESTIONS_QUERY,
    variables: { sessionId },
    pause: !sessionId,
  });

  useEffect(() => {
    if (!queryResult.data?.liveQAQuestions || initialLoaded) return;
    setQuestions(queryResult.data.liveQAQuestions);
    setInitialLoaded(true);
  }, [queryResult.data, initialLoaded]);

  const [subResult] = useSubscription<LiveQAUpdatedSubResult>({
    query: LIVE_QA_UPDATED_SUB,
    variables: { sessionId },
    pause: paused || !sessionId,
  });

  useEffect(() => {
    const incoming = subResult.data?.liveQAUpdated;
    if (!incoming) return;
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === incoming.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = incoming;
        return updated;
      }
      return [...prev, incoming];
    });
  }, [subResult.data]);

  const sortedQuestions = useMemo(
    () =>
      [...questions].sort((a, b) => {
        if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [questions]
  );

  const [, executeAsk] = useMutation(ASK_LIVE_QUESTION_MUTATION);
  const [, executeUpvote] = useMutation(UPVOTE_LIVE_QUESTION_MUTATION);
  const [, executeAnswer] = useMutation(ANSWER_LIVE_QUESTION_MUTATION);
  const [, executeDismiss] = useMutation(DISMISS_LIVE_QUESTION_MUTATION);

  const askQuestion = useCallback(async (question: string) => {
    await executeAsk({ sessionId, question });
  }, [sessionId, executeAsk]);

  const upvoteQuestion = useCallback(async (questionId: string) => {
    // Optimistic update
    setQuestions((prev) =>
      prev.map((q) => q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q)
    );
    const result = await executeUpvote({ questionId });
    if (result.error) {
      // Revert optimistic update
      setQuestions((prev) =>
        prev.map((q) => q.id === questionId ? { ...q, upvotes: q.upvotes - 1 } : q)
      );
    }
  }, [executeUpvote]);

  const answerQuestion = useCallback(async (questionId: string, answer: string) => {
    await executeAnswer({ questionId, answer });
  }, [executeAnswer]);

  const dismissQuestion = useCallback(async (questionId: string) => {
    await executeDismiss({ questionId });
  }, [executeDismiss]);

  return {
    questions,
    sortedQuestions,
    fetching: queryResult.fetching,
    askQuestion,
    upvoteQuestion,
    answerQuestion,
    dismissQuestion,
  };
}
