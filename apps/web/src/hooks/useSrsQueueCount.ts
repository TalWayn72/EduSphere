import { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { SRS_QUEUE_COUNT_QUERY } from '@/lib/graphql/srs.queries';

interface SrsQueueCountData {
  srsQueueCount: number;
}

/**
 * Returns the number of SRS cards currently due for review.
 * Returns 0 when paused, loading, or on error (graceful degradation).
 *
 * React 19 concurrent-mode safety: the urql query is deferred until after
 * the component mounts to prevent graphcache from synchronously dispatching
 * a state update into the Layout fiber while React is still rendering it in
 * the work-in-progress tree (the "Cannot update a component while rendering
 * a different component" console error).
 * Same fix pattern documented in useCourseNavigation.ts.
 */
export function useSrsQueueCount(pause = false): number {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [result] = useQuery<SrsQueueCountData>({
    query: SRS_QUEUE_COUNT_QUERY,
    pause: !mounted || pause,
    requestPolicy: 'network-only',
  });

  if (result.error) {
    console.error('[useSrsQueueCount] GraphQL error:', result.error.message);
  }

  return result.data?.srsQueueCount ?? 0;
}
