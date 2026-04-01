import { useState, useCallback } from 'react';
import { useMutation } from 'urql';
import type { ExamResult } from '@/types/exam-entities';

const START_SESSION_MUTATION = `
  mutation StartExamSession($blueprintId: ID!) {
    startExamSession(blueprintId: $blueprintId) {
      id blueprintId status attemptNumber
      startedAt timeRemainingSeconds
      questionOrder isAdaptive currentQuestionIndex
    }
  }
`;

const SUBMIT_ANSWER_MUTATION = `
  mutation SubmitExamAnswer($sessionId: ID!, $itemId: ID!, $answer: JSON!) {
    submitExamAnswer(sessionId: $sessionId, itemId: $itemId, answer: $answer)
  }
`;

const FLAG_QUESTION_MUTATION = `
  mutation FlagExamQuestion($sessionId: ID!, $itemId: ID!) {
    flagExamQuestion(sessionId: $sessionId, itemId: $itemId)
  }
`;

const SUBMIT_EXAM_MUTATION = `
  mutation SubmitExam($sessionId: ID!) {
    submitExam(sessionId: $sessionId) {
      id sessionId passed rawScore scaledScore
      thetaEstimate sem confidenceInterval
      domainScores { domain correct total scaledScore }
      bloomScores { level correct total }
      gradedAt
    }
  }
`;

export function useStartExamSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, executeMutation] = useMutation(START_SESSION_MUTATION);

  const startSession = useCallback(
    async (blueprintId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await executeMutation({ blueprintId });
        if (res.error) {
          console.error(
            '[useStartExamSession] Start failed:',
            res.error.message
          );
          setError('Failed to start exam session.');
          return null;
        }
        return res.data?.startExamSession ?? null;
      } catch (err) {
        console.error('[useStartExamSession] Unexpected error:', err);
        setError('Failed to start exam session.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [executeMutation]
  );

  return { startSession, loading, error };
}

export function useSubmitExamAnswer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, executeMutation] = useMutation(SUBMIT_ANSWER_MUTATION);

  const submitAnswer = useCallback(
    async (sessionId: string, itemId: string, answer: unknown) => {
      setLoading(true);
      setError(null);
      try {
        const res = await executeMutation({ sessionId, itemId, answer });
        if (res.error) {
          console.error(
            '[useSubmitExamAnswer] Submit failed:',
            res.error.message
          );
          setError('Failed to submit answer.');
          return null;
        }
        return res.data?.submitExamAnswer ?? null;
      } catch (err) {
        console.error('[useSubmitExamAnswer] Unexpected error:', err);
        setError('Failed to submit answer.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [executeMutation]
  );

  return { submitAnswer, loading, error };
}

export function useFlagExamQuestion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, executeMutation] = useMutation(FLAG_QUESTION_MUTATION);

  const flagQuestion = useCallback(
    async (sessionId: string, itemId: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await executeMutation({ sessionId, itemId });
        if (res.error) {
          console.error(
            '[useFlagExamQuestion] Flag failed:',
            res.error.message
          );
          setError('Failed to flag question.');
          return null;
        }
        return res.data?.flagExamQuestion ?? null;
      } catch (err) {
        console.error('[useFlagExamQuestion] Unexpected error:', err);
        setError('Failed to flag question.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [executeMutation]
  );

  return { flagQuestion, loading, error };
}

export function useSubmitExam() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, executeMutation] = useMutation(SUBMIT_EXAM_MUTATION);

  const submitExam = useCallback(
    async (sessionId: string): Promise<ExamResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await executeMutation({ sessionId });
        if (res.error) {
          console.error('[useSubmitExam] Submit failed:', res.error.message);
          setError('Failed to submit exam.');
          return null;
        }
        return res.data?.submitExam ?? null;
      } catch (err) {
        console.error('[useSubmitExam] Unexpected error:', err);
        setError('Failed to submit exam.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [executeMutation]
  );

  return { submitExam, loading, error };
}
