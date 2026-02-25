/**
 * useSubmitAssignment — React hook for submitting text assignments (F-005)
 */
import { useState, useCallback } from 'react';
import { useMutation } from 'urql';

const SUBMIT_ASSIGNMENT_MUTATION = `
  mutation SubmitTextAssignment(
    $contentItemId: ID!
    $textContent: String!
    $courseId: ID!
  ) {
    submitTextAssignment(
      contentItemId: $contentItemId
      textContent: $textContent
      courseId: $courseId
    ) {
      id
      contentItemId
      submittedAt
      wordCount
    }
  }
`;

export interface SubmittedAssignment {
  id: string;
  contentItemId: string;
  submittedAt: string;
  wordCount: number;
}

interface UseSubmitAssignmentReturn {
  submit: (textContent: string) => Promise<SubmittedAssignment | null>;
  loading: boolean;
  error: string | null;
}

export function useSubmitAssignment(
  contentItemId: string,
  courseId: string,
): UseSubmitAssignmentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, executeMutation] = useMutation(SUBMIT_ASSIGNMENT_MUTATION);

  const submit = useCallback(
    async (textContent: string): Promise<SubmittedAssignment | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await executeMutation({
          contentItemId,
          courseId,
          textContent,
        });
        if (result.error) {
          setError(result.error.message);
          return null;
        }
        return (result.data as { submitTextAssignment: SubmittedAssignment } | null)
          ?.submitTextAssignment ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Submission failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [contentItemId, courseId, executeMutation],
  );

  return { submit, loading, error };
}
