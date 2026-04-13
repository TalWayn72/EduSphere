/**
 * useLiveTranscript — fetches initial transcript segments and subscribes to updates.
 *
 * Handles partial→final segment merging: when a segment with the same index
 * arrives and the existing entry is not yet final, it replaces it (streaming update).
 * Memory safety: subscription is paused on unmount.
 */
import { useState, useEffect } from 'react';
import { useQuery, useSubscription } from 'urql';
import {
  LIVE_TRANSCRIPT_QUERY,
  LIVE_TRANSCRIPT_UPDATED_SUB,
} from '@/lib/graphql/live-stream-session.queries';
import type { LiveTranscriptSegment } from '@/types/live-session.types';

// ── Local interfaces ───────────────────────────────────────────────────────────

interface LiveTranscriptQueryResult {
  liveTranscript: LiveTranscriptSegment[];
}

interface LiveTranscriptSubResult {
  liveTranscriptUpdated: LiveTranscriptSegment | null;
}

export interface UseLiveTranscriptReturn {
  segments: LiveTranscriptSegment[];
  fetching: boolean;
}

// ── Merge helper ──────────────────────────────────────────────────────────────

function mergeSegment(
  prev: LiveTranscriptSegment[],
  incoming: LiveTranscriptSegment
): LiveTranscriptSegment[] {
  const existingIdx = prev.findIndex((s) => s.index === incoming.index);
  if (existingIdx !== -1 && !prev[existingIdx]!.isFinal) {
    const updated = [...prev];
    updated[existingIdx] = incoming;
    return updated;
  }
  if (existingIdx !== -1) return prev; // already final — skip
  return [...prev, incoming].sort((a, b) => a.index - b.index);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveTranscript(sessionId: string): UseLiveTranscriptReturn {
  const [paused, setPaused] = useState(false);
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    setPaused(false);
    return () => { setPaused(true); };
  }, []);

  const [queryResult] = useQuery<LiveTranscriptQueryResult>({
    query: LIVE_TRANSCRIPT_QUERY,
    variables: { sessionId, afterIndex: 0 },
    pause: !sessionId,
  });

  useEffect(() => {
    if (!queryResult.data?.liveTranscript || initialLoaded) return;
    const sorted = [...queryResult.data.liveTranscript].sort(
      (a, b) => a.index - b.index
    );
    setSegments(sorted);
    setInitialLoaded(true);
  }, [queryResult.data, initialLoaded]);

  const [subResult] = useSubscription<LiveTranscriptSubResult>({
    query: LIVE_TRANSCRIPT_UPDATED_SUB,
    variables: { sessionId },
    pause: paused || !sessionId,
  });

  useEffect(() => {
    const incoming = subResult.data?.liveTranscriptUpdated;
    if (!incoming) return;
    setSegments((prev) => mergeSegment(prev, incoming));
  }, [subResult.data]);

  return {
    segments,
    fetching: queryResult.fetching,
  };
}
