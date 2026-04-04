/**
 * useEnrichedLesson — fetches enriched lesson data (blocks, citations, anchors).
 *
 * Uses mounted-guard pattern to prevent urql cache dispatch on sibling routes.
 */
import { useEffect, useState } from 'react';
import { useQuery } from 'urql';
import { ENRICHED_LESSON_QUERY } from '@/lib/graphql/enriched-lesson.queries';
import type { EnrichedLessonData } from '@/components/enriched-transcript/enriched-transcript.types';

interface EnrichedLessonQueryResult {
  enrichedLesson: EnrichedLessonData | null;
}

export interface UseEnrichedLessonReturn {
  data: EnrichedLessonData | null;
  fetching: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEnrichedLesson(lessonId: string): UseEnrichedLessonReturn {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [result, reexecute] = useQuery<EnrichedLessonQueryResult>({
    query: ENRICHED_LESSON_QUERY,
    variables: { lessonId },
    pause: !mounted || !lessonId,
  });

  const refetch = () => {
    reexecute({ requestPolicy: 'network-only' });
  };

  return {
    data: result.data?.enrichedLesson ?? null,
    fetching: result.fetching,
    error: result.error?.message ?? null,
    refetch,
  };
}
