/**
 * useLiveReactions — subscribes to reaction bursts and manages an animation queue.
 *
 * Queue is capped at 10 items. Each burst is automatically removed after 2000ms.
 * Memory safety: all timers are cleared on unmount, subscription paused on unmount.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useSubscription } from 'urql';
import {
  SEND_LIVE_REACTION_MUTATION,
  LIVE_REACTION_BURST_SUB,
} from '@/lib/graphql/live-chat.queries';
import type { LiveReactionBurst } from '@/types/live-session.types';

// ── Local interfaces ───────────────────────────────────────────────────────────

interface LiveReactionBurstSubResult {
  liveReactionBurst: LiveReactionBurst | null;
}

export interface UseLiveReactionsReturn {
  animationQueue: LiveReactionBurst[];
  sendReaction(emoji: string): Promise<void>;
}

const MAX_QUEUE = 10;
const BURST_LIFETIME_MS = 2000;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveReactions(sessionId: string): UseLiveReactionsReturn {
  const [paused, setPaused] = useState(false);
  const [animationQueue, setAnimationQueue] = useState<LiveReactionBurst[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setPaused(false);
    const timers = timerRefs.current;
    return () => {
      setPaused(true);
      // Clear all pending timers on unmount
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const [subResult] = useSubscription<LiveReactionBurstSubResult>({
    query: LIVE_REACTION_BURST_SUB,
    variables: { sessionId },
    pause: paused || !sessionId,
  });

  useEffect(() => {
    const incoming = subResult.data?.liveReactionBurst;
    if (!incoming) return;

    const key = `${incoming.emoji}-${incoming.burstAt}`;

    setAnimationQueue((prev) => {
      const next = [incoming, ...prev].slice(0, MAX_QUEUE);
      return next;
    });

    // Auto-remove after lifetime
    const timer = setTimeout(() => {
      setAnimationQueue((prev) => prev.filter(
        (b) => `${b.emoji}-${b.burstAt}` !== key
      ));
      timerRefs.current.delete(key);
    }, BURST_LIFETIME_MS);

    timerRefs.current.set(key, timer);
  }, [subResult.data]);

  const [, executeSend] = useMutation(SEND_LIVE_REACTION_MUTATION);

  const sendReaction = useCallback(async (emoji: string) => {
    await executeSend({ sessionId, emoji });
  }, [sessionId, executeSend]);

  return { animationQueue, sendReaction };
}
