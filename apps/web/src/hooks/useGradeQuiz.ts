import { useState, useCallback } from 'react';
import { useMutation } from 'urql';
import type { QuizResult } from '@/types/quiz';

const GRADE_QUIZ_MUTATION = `
  mutation GradeQuizSubmission($contentItemId: ID!, $answers: JSON!) {
    gradeQuizSubmission(contentItemId: $contentItemId, answers: $answers) {
      id
      score
      passed
      itemResults {
        itemIndex
        correct
        explanation
        partialScore
      }
      submittedAt
    }
  }
`;

interface UseGradeQuizReturn {
  gradeQuiz: (answers: Record<number, unknown>) => Promise<QuizResult | null>;
  loading: boolean;
  error: string | null;
}

export function useGradeQuiz(contentItemId: string): UseGradeQuizReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, executeMutation] = useMutation(GRADE_QUIZ_MUTATION);

  const gradeQuiz = useCallback(
    async (answers: Record<number, unknown>): Promise<QuizResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await executeMutation({ contentItemId, answers });
        if (result.error) {
          console.error('[useGradeQuiz] Grading failed:', result.error.message);
          setError('Failed to grade quiz. Please try again.');
          return null;
        }
        return result.data?.gradeQuizSubmission ?? null;
      } catch (err) {
        console.error('[useGradeQuiz] Unexpected error:', err);
        setError('Failed to grade quiz. Please try again.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [contentItemId, executeMutation]
  );

  return { gradeQuiz, loading, error };
}
