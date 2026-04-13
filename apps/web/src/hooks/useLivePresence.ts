/**
 * useLivePresence — fetches initial presence data and subscribes to changes.
 *
 * Memory safety: subscription is paused on unmount.
 */
import { useState, useEffect } from 'react';
import { useQuery, useSubscription } from 'urql';
import {
  LIVE_PRESENCE_QUERY,
  LIVE_PRESENCE_CHANGED_SUB,
} from '@/lib/graphql/live-stream-session.queries';
import type { LiveViewer } from '@/types/live-session.types';

// ── Local interfaces ───────────────────────────────────────────────────────────

interface LivePresenceQueryResult {
  livePresence: { viewerCount: number; viewers: LiveViewer[] } | null;
}

interface LivePresenceSubResult {
  livePresenceChanged: { viewerCount: number; viewers: LiveViewer[] } | null;
}

export interface UseLivePresenceReturn {
  viewerCount: number;
  viewers: LiveViewer[];
  fetching: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLivePresence(sessionId: string): UseLivePresenceReturn {
  const [paused, setPaused] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState<LiveViewer[]>([]);

  useEffect(() => {
    setPaused(false);
    return () => {
      setPaused(true);
    };
  }, []);

  const [queryResult] = useQuery<LivePresenceQueryResult>({
    query: LIVE_PRESENCE_QUERY,
    variables: { sessionId },
    pause: !sessionId,
  });

  useEffect(() => {
    const presence = queryResult.data?.livePresence;
    if (!presence) return;
    setViewerCount(presence.viewerCount);
    setViewers(presence.viewers);
  }, [queryResult.data]);

  const [subResult] = useSubscription<LivePresenceSubResult>({
    query: LIVE_PRESENCE_CHANGED_SUB,
    variables: { sessionId },
    pause: paused || !sessionId,
  });

  useEffect(() => {
    const incoming = subResult.data?.livePresenceChanged;
    if (!incoming) return;
    setViewerCount(incoming.viewerCount);
    setViewers(incoming.viewers);
  }, [subResult.data]);

  return { viewerCount, viewers, fetching: queryResult.fetching };
}
