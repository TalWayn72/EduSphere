import { useMutation } from 'urql';
import { toast } from 'sonner';
import {
  START_LIVE_SESSION_MUTATION,
  END_LIVE_SESSION_MUTATION,
  JOIN_LIVE_SESSION_MUTATION,
  CANCEL_LIVE_SESSION_MUTATION,
} from '@/lib/graphql/live-session.queries';

interface UseLiveSessionActionsReturn {
  startSession: (sessionId: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  joinSession: (sessionId: string) => Promise<string | null>;
  cancelSession: (sessionId: string) => Promise<void>;
  startFetching: boolean;
  endFetching: boolean;
  joinFetching: boolean;
  cancelFetching: boolean;
}

/**
 * Encapsulates the four live session action mutations with error toast handling.
 * Keeps LiveSessionsPage under the 200-line limit by extracting mutation logic.
 */
export function useLiveSessionActions(): UseLiveSessionActionsReturn {
  const [startResult, executeStart] = useMutation(START_LIVE_SESSION_MUTATION);
  const [endResult, executeEnd] = useMutation(END_LIVE_SESSION_MUTATION);
  const [joinResult, executeJoin] = useMutation(JOIN_LIVE_SESSION_MUTATION);
  const [cancelResult, executeCancel] = useMutation(CANCEL_LIVE_SESSION_MUTATION);

  const startSession = async (sessionId: string): Promise<void> => {
    const result = await executeStart({ sessionId });
    if (result.error) {
      toast.error('Failed to start session. Please try again.');
    }
  };

  const endSession = async (sessionId: string): Promise<void> => {
    const result = await executeEnd({ sessionId });
    if (result.error) {
      toast.error('Failed to end session. Please try again.');
    }
  };

  const joinSession = async (sessionId: string): Promise<string | null> => {
    const result = await executeJoin({ sessionId });
    if (result.error) {
      toast.error('Failed to join session. Please try again.');
      return null;
    }
    return (result.data?.joinLiveSession?.roomUrl as string | undefined) ?? null;
  };

  const cancelSession = async (sessionId: string): Promise<void> => {
    const result = await executeCancel({ sessionId });
    if (result.error) {
      toast.error('Failed to cancel session. Please try again.');
    }
  };

  return {
    startSession,
    endSession,
    joinSession,
    cancelSession,
    startFetching: startResult.fetching,
    endFetching: endResult.fetching,
    joinFetching: joinResult.fetching,
    cancelFetching: cancelResult.fetching,
  };
}
