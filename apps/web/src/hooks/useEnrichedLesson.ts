/**
 * useEnrichedLesson — fetches enriched lesson data (blocks, citations, anchors).
 *
 * Uses mounted-guard pattern to prevent urql cache dispatch on sibling routes.
 * Supports optional auto-polling while the enrichment pipeline is in progress.
 */
import { useEffect, useState, useRef } from 'react';
import { useQuery } from 'urql';
import { ENRICHED_LESSON_QUERY } from '@/lib/graphql/enriched-lesson.queries';
import type { EnrichedLessonData } from '@/components/enriched-transcript/enriched-transcript.types';

/** Terminal states — polling stops when status reaches one of these. */
const TERMINAL_STATES = new Set(['READY', 'PUBLISHED', 'PENDING']);

/** In-progress states — polling is active when status is one of these. */
export type EnrichmentProcessingStatus =
  | 'EXTRACTING_TRANSCRIPT'
  | 'RUNNING_NER'
  | 'RESOLVING_CITATIONS';

interface EnrichedLessonQueryResult {
  enrichedLesson: EnrichedLessonData | null;
}

export interface UseEnrichedLessonOptions {
  /** When true, auto-poll every 3 s while enrichment pipeline is in progress. */
  pollWhileProcessing?: boolean;
}

export interface UseEnrichedLessonReturn {
  data: EnrichedLessonData | null;
  fetching: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL_MS = 3000;

export function useEnrichedLesson(
  lessonId: string,
  options: UseEnrichedLessonOptions = {}
): UseEnrichedLessonReturn {
  const { pollWhileProcessing = false } = options;
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    setMounted(true);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [result, reexecute] = useQuery<EnrichedLessonQueryResult>({
    query: ENRICHED_LESSON_QUERY,
    variables: { lessonId },
    pause: !mounted || !lessonId,
  });

  const refetch = () => {
    reexecute({ requestPolicy: 'network-only' });
  };

  // Auto-polling: start when processing, stop when terminal state reached.
  useEffect(() => {
    if (!pollWhileProcessing || !mounted) return;

    const status = result.data?.enrichedLesson?.enrichmentStatus;
    const isProcessing = status !== undefined && !TERMINAL_STATES.has(status);

    if (isProcessing && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          reexecute({ requestPolicy: 'network-only' });
        }
      }, POLL_INTERVAL_MS);
    } else if (!isProcessing && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    pollWhileProcessing,
    mounted,
    result.data?.enrichedLesson?.enrichmentStatus,
    reexecute,
  ]);

  return {
    data: result.data?.enrichedLesson ?? null,
    fetching: result.fetching,
    error: result.error?.message ?? null,
    refetch,
  };
}
