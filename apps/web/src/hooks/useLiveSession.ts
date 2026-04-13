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
import type { LiveStreamSession, LiveSessionPhase } from '@/types/live-session.types';

// ── Local interfaces ───────────────────────────────────────────────────────────

interface LiveStreamSessionQueryResult {
  liveStreamSession: LiveStreamSession | null;
}

interface JoinLiveStreamResult {
  joinLiveStream: { sessionId: string; viewerToken: string; streamUrl: string } | null;
}

interface LiveSessionStatusSubResult {
  liveSessionStatus: {
    sessionId: string;
    phase: LiveSessionPhase;
    viewerCount: number;
    isScreenSharing: boolean;
    highlightMoments: Array<{ id: string; timestamp: number; label: string }>;
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
  const [viewerToken, setViewerToken] = useState<string | null>(null);

  useEffect(() => {
    setPaused(false);
    return () => { setPaused(true); };
  }, []);

  const [queryResult] = useQuery<LiveStreamSessionQueryResult>({
    query: LIVE_STREAM_SESSION_QUERY,
    variables: { sessionId },
    pause: !sessionId,
  });

  const [, executeJoin] = useMutation<JoinLiveStreamResult>(JOIN_LIVE_SESSION_MUTATION);
  const [, executeLeave] = useMutation(LEAVE_LIVE_SESSION_MUTATION);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    executeJoin({ sessionId }).then((result) => {
      if (active && result.data?.joinLiveStream?.viewerToken) {
        setViewerToken(result.data.joinLiveStream.viewerToken);
      }
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
  const statusUpdate = subResult.data?.liveSessionStatus;
  const mergedSession: LiveStreamSession | null = session && statusUpdate
    ? {
        ...session,
        phase: statusUpdate.phase,
        viewerCount: statusUpdate.viewerCount,
        isScreenSharing: statusUpdate.isScreenSharing,
        highlightMoments: statusUpdate.highlightMoments.map((m) => ({
          ...m,
          sessionId,
        })),
      }
    : session;

  return {
    session: mergedSession,
    fetching: queryResult.fetching,
    error: queryResult.error ?? null,
    viewerToken,
  };
}
