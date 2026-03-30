import { useRef, useEffect, useCallback } from 'react';
import { useSubscription } from 'urql';
import {
  EXECUTION_STATUS_SUBSCRIPTION,
  AGENT_EXECUTION_QUERY,
} from '@/lib/graphql/agent-course-gen.queries';
import { urqlClient } from '@/lib/urql-client';
import type {
  ExecutionStatusPayload,
  AgentExecutionResult,
  ExecutionOutputData,
} from './types';
import { POLL_INTERVAL_MS, HARD_TIMEOUT_MS } from './types';

interface UseExecutionTrackingOptions {
  executionId: string | null;
  generating: boolean;
  pauseSubscription: boolean;
  onResult: (status: string, output: ExecutionOutputData | null) => void;
  onTimeout: () => void;
}

/**
 * BUG-095: Tracks agent execution via WebSocket subscription + HTTP polling fallback.
 * Returns subscription data ref and cleanup helpers.
 */
export function useExecutionTracking({
  executionId,
  generating,
  pauseSubscription,
  onResult,
  onTimeout,
}: UseExecutionTrackingOptions) {
  const resultHandledRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
  }, []);

  // Subscription (fast path)
  const [{ data: subData }] = useSubscription<ExecutionStatusPayload>({
    query: EXECUTION_STATUS_SUBSCRIPTION,
    variables: { executionId },
    pause: pauseSubscription,
  });

  const handleResult = useCallback(
    (status: string, output: ExecutionOutputData | null) => {
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;
      clearTimers();
      onResult(status, output);
    },
    [clearTimers, onResult],
  );

  // Handle subscription data
  useEffect(() => {
    if (!subData) return;
    const exec = subData.executionStatusChanged;
    if (exec.status === 'COMPLETED' || exec.status === 'FAILED') {
      handleResult(exec.status, exec.output);
    }
  }, [subData, handleResult]);

  // BUG-095: Polling via direct urqlClient.query()
  useEffect(() => {
    if (!generating || !executionId || resultHandledRef.current) return;

    const startDelay = setTimeout(() => {
      if (resultHandledRef.current) return;
      pollTimerRef.current = setInterval(async () => {
        if (resultHandledRef.current) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }
        try {
          const result = await urqlClient
            .query<AgentExecutionResult>(
              AGENT_EXECUTION_QUERY,
              { id: executionId },
              { requestPolicy: 'network-only' },
            )
            .toPromise();
          if (resultHandledRef.current) return;
          const exec = result.data?.agentExecution;
          if (!exec) return;
          if (exec.status === 'COMPLETED' || exec.status === 'FAILED') {
            handleResult(exec.status, exec.output);
          }
        } catch (err) {
          console.error('[AiCourseCreatorModal] Poll error:', err);
        }
      }, POLL_INTERVAL_MS);
    }, POLL_INTERVAL_MS);

    hardTimeoutRef.current = setTimeout(() => {
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;
      clearTimers();
      onTimeout();
    }, HARD_TIMEOUT_MS);

    return () => {
      clearTimeout(startDelay);
      clearTimers();
    };
  }, [generating, executionId, handleResult, clearTimers, onTimeout]);

  return {
    resultHandledRef,
    clearTimers,
    resetTracking: () => {
      resultHandledRef.current = false;
      clearTimers();
    },
    markHandled: () => {
      resultHandledRef.current = true;
    },
  };
}
