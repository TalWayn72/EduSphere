/**
 * useProctoringSession — manages a remote proctoring session lifecycle.
 *
 * Provides start / flag / end actions backed by GraphQL mutations.
 * `isActive` = status is ACTIVE or FLAGGED (session running).
 */
import { useState, useCallback } from 'react';
import { useMutation } from 'urql';
import {
  START_PROCTORING_SESSION_MUTATION,
  FLAG_PROCTORING_EVENT_MUTATION,
  END_PROCTORING_SESSION_MUTATION,
} from '@/lib/graphql/proctoring.queries';

interface ProctoringFlag {
  type: string;
  timestamp: string;
  detail?: string | null;
}

interface ProctoringSession {
  id: string;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
  flagCount: number;
  flags?: ProctoringFlag[];
}

interface UseProctoringSessionReturn {
  sessionId: string | null;
  status: string | null;
  flagCount: number;
  isActive: boolean;
  start: () => Promise<void>;
  flag: (type: string, detail?: string) => Promise<void>;
  end: () => Promise<void>;
}

export function useProctoringSession(assessmentId: string): UseProctoringSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [flagCount, setFlagCount] = useState(0);

  const [, executeStart] = useMutation(START_PROCTORING_SESSION_MUTATION);
  const [, executeFlag] = useMutation(FLAG_PROCTORING_EVENT_MUTATION);
  const [, executeEnd] = useMutation(END_PROCTORING_SESSION_MUTATION);

  const start = useCallback(async () => {
    const result = await executeStart({ assessmentId });
    const session = result.data?.startProctoringSession as ProctoringSession | undefined;
    if (session) {
      setSessionId(session.id);
      setStatus(session.status);
      setFlagCount(session.flagCount);
    }
  }, [assessmentId, executeStart]);

  const flag = useCallback(
    async (type: string, detail?: string) => {
      if (!sessionId) return;
      const result = await executeFlag({ sessionId, type, detail });
      const session = result.data?.flagProctoringEvent as ProctoringSession | undefined;
      if (session) {
        setStatus(session.status);
        setFlagCount(session.flagCount);
      }
    },
    [sessionId, executeFlag]
  );

  const end = useCallback(async () => {
    if (!sessionId) return;
    const result = await executeEnd({ sessionId });
    const session = result.data?.endProctoringSession as ProctoringSession | undefined;
    if (session) {
      setStatus(session.status);
      setFlagCount(session.flagCount);
    }
    setSessionId(null);
  }, [sessionId, executeEnd]);

  const isActive = status === 'ACTIVE' || status === 'FLAGGED';

  return { sessionId, status, flagCount, isActive, start, flag, end };
}
