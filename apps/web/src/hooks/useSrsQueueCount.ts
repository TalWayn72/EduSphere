import { useQuery } from 'urql';
import { SRS_QUEUE_COUNT_QUERY } from '@/lib/graphql/srs.queries';

interface SrsQueueCountData {
  srsQueueCount: number;
}

/**
 * Returns the number of SRS cards currently due for review.
 * Returns 0 when paused, loading, or on error (graceful degradation).
 *
 * Memory safety: urql useQuery is stateless; no manual cleanup needed.
 * The hook re-fetches whenever the component re-mounts (cache-and-network).
 */
export function useSrsQueueCount(pause = false): number {
  const [result] = useQuery<SrsQueueCountData>({
    query: SRS_QUEUE_COUNT_QUERY,
    pause,
    requestPolicy: 'cache-and-network',
  });
  return result.data?.srsQueueCount ?? 0;
}
