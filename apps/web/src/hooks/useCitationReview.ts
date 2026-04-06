/**
 * useCitationReview — approve/reject/edit mutations for lesson citations.
 *
 * Wraps the updateLessonCitation mutation with convenience methods.
 */
import { useCallback } from 'react';
import { useMutation } from 'urql';
import { UPDATE_CITATION_MUTATION } from '@/lib/graphql/enriched-lesson.queries';
import type { CitationMatchStatus } from '@/components/enriched-transcript/enriched-transcript.types';

interface UpdateCitationResult {
  updateLessonCitation: {
    id: string;
    matchStatus: CitationMatchStatus;
  };
}

interface UpdateCitationVariables {
  citationId: string;
  input: {
    matchStatus?: CitationMatchStatus;
    sourceText?: string;
    bookName?: string;
    part?: string;
    page?: string;
    column?: string;
    paragraph?: string;
    resolvedText?: string;
    confidence?: number;
  };
}

export interface UseCitationReviewReturn {
  approve: (citationId: string) => Promise<void>;
  reject: (citationId: string) => Promise<void>;
  updateCitation: (
    citationId: string,
    fields: UpdateCitationVariables['input']
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useCitationReview(): UseCitationReviewReturn {
  const [result, executeMutation] = useMutation<
    UpdateCitationResult,
    UpdateCitationVariables
  >(UPDATE_CITATION_MUTATION);

  const approve = useCallback(
    async (citationId: string) => {
      await executeMutation({
        citationId,
        input: { matchStatus: 'VERIFIED' },
      });
    },
    [executeMutation]
  );

  const reject = useCallback(
    async (citationId: string) => {
      await executeMutation({
        citationId,
        input: { matchStatus: 'REJECTED' },
      });
    },
    [executeMutation]
  );

  const updateCitation = useCallback(
    async (citationId: string, fields: UpdateCitationVariables['input']) => {
      await executeMutation({ citationId, input: fields });
    },
    [executeMutation]
  );

  return {
    approve,
    reject,
    updateCitation,
    loading: result.fetching,
    error: result.error?.message ?? null,
  };
}
