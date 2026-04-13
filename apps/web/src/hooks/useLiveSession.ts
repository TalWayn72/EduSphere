/**
 * useLiveSession — fetches session data and subscribes to status updates.
 *
 * Memory safety: subscription is paused on unmount.
 * Lifecycle: joins session on mount, leaves on unmount via mutations.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from 'urql';
import {
  LIVE_STREAM_SESSION_QUERY,
  JOIN_LIVE_SESSION_MUTATION,
  LEAVE_LIVE_SESSION_MUTATION,
  LIVE_SESSION_STATUS_SUB,
} from '@/lib/graphql/live-stream-session.queries';
import type {
  LiveStreamSession,
  LiveSessionPhase,
} from '@/types/live-session.types';

// ── Local interfaces ───────────────────────────────────────────────────────────

interface LiveStreamSessionQueryResult {
  liveStreamSession: LiveStreamSession | null;
}

interface JoinLiveSessionResult {
  joinLiveSession: {
    activeViewers: number;
    viewers: Array<{ userId: string; joinedAt: string }>;
  } | null;
}

interface LiveSessionStatusSubResult {
  liveSessionStatusChanged: {
    id: string;
    status: LiveSessionPhase;
    viewerCount: number;
    isScreenSharing: boolean;
  } | null;
}

export interface UseLiveSessionReturn {
  session: LiveStreamSession | null;
  fetching: boolean;
  error: Error | null;
  viewerToken: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveSession(sessionId: string): UseLiveSessionReturn {
  const [paused, setPaused] = useState(false);
  // viewerToken kept for API compatibility — joinLiveSession no longer returns one
  const [viewerToken] = useState<string | null>(null);

  useEffect(() => {
    setPaused(false);
    return () => {
      setPaused(true);
    };
  }, []);

  const [queryResult] = useQuery<LiveStreamSessionQueryResult>({
    query: LIVE_STREAM_SESSION_QUERY,
    variables: { sessionId },
    pause: !sessionId,
  });

  const [, executeJoin] = useMutation<JoinLiveSessionResult>(
    JOIN_LIVE_SESSION_MUTATION
  );
  const [, executeLeave] = useMutation(LEAVE_LIVE_SESSION_MUTATION);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    executeJoin({ sessionId }).then(() => {
      // joinLiveSession returns LivePresenceInfo, no viewerToken
      if (!active) return;
    });
    return () => {
      active = false;
      executeLeave({ sessionId });
    };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [subResult] = useSubscription<LiveSessionStatusSubResult>({
    query: LIVE_SESSION_STATUS_SUB,
    variables: { sessionId },
    pause: paused || !sessionId,
  });

  // Merge subscription status updates into session data
  const session = queryResult.data?.liveStreamSession ?? null;
  const statusUpdate = subResult.data?.liveSessionStatusChanged;
  const mergedSession: LiveStreamSession | null =
    session && statusUpdate
      ? {
          ...session,
          status: statusUpdate.status,
          phase: statusUpdate.status,
          viewerCount: statusUpdate.viewerCount,
          isScreenSharing: statusUpdate.isScreenSharing,
        }
      : session
        ? { ...session, phase: session.status }
        : null;

  return {
    session: mergedSession,
    fetching: queryResult.fetching,
    error: queryResult.error ?? null,
    viewerToken,
  };
}
