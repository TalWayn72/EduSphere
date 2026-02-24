/**
 * useChavrutaDebate — manages state for a focused Chavruta debate session.
 * SI-10: Consent gate blocks all LLM calls until AI_PROCESSING consent is granted.
 * Memory safe: subscription paused on unmount, mock timeout cleared.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useSubscription } from 'urql';
import { i18n } from '@/lib/i18n';
import {
  START_AGENT_SESSION_MUTATION,
  SEND_AGENT_MESSAGE_MUTATION,
  MESSAGE_STREAM_SUBSCRIPTION,
} from '@/lib/graphql/agent.queries';

export interface DebateMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const DEBATE_TOPICS = [
  'Does free will exist in a deterministic universe?',
  'Is the pursuit of knowledge a moral obligation?',
  'Can artificial intelligence possess true understanding?',
  'Is civil disobedience ever morally justified?',
];

const MOCK_RESPONSES = [
  "A compelling argument! But consider: if determinism holds, how can Rambam's framework of moral responsibility be coherent?",
  'Strong position. Yet the Ramban argues the opposite from the same source. How do you reconcile these two authorities?',
  'Excellent reasoning! Now steelman the opposing view — that is the true Chavruta method.',
  'Can you find a source in the Talmud that supports or contradicts this position?',
];

const AI_CONSENT_KEY = 'edusphere_consent_AI_PROCESSING';

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] as T; }

export interface UseChavrutaDebateReturn {
  messages: DebateMessage[];
  topic: string;
  isLoading: boolean;
  error: string | null;
  needsConsent: boolean;
  grantConsent: () => void;
  submitArgument: (text: string) => Promise<void>;
  startNewTopic: () => void;
}

export function useChavrutaDebate(topicId?: string): UseChavrutaDebateReturn {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [topic, setTopic] = useState<string>(() => pick(DEBATE_TOPICS));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(() => localStorage.getItem(AI_CONSENT_KEY) !== 'true');
  const [subPaused, setSubPaused] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Memory safety: pause subscription and clear pending timer on unmount
  useEffect(() => {
    return () => {
      setSubPaused(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const [, startSession] = useMutation(START_AGENT_SESSION_MUTATION);
  const [, sendAgentMessage] = useMutation(SEND_AGENT_MESSAGE_MUTATION);

  const [streamResult] = useSubscription({
    query: MESSAGE_STREAM_SUBSCRIPTION,
    variables: { sessionId: sessionId ?? '' },
    pause: subPaused || !sessionId,
  });

  useEffect(() => {
    const msg = streamResult.data?.messageStream;
    if (!msg) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === (msg.id as string));
      const incoming: DebateMessage = { id: msg.id as string, role: 'ai', content: msg.content as string, timestamp: new Date() };
      if (idx !== -1) { const u = [...prev]; u[idx] = incoming; return u; }
      return [...prev, incoming];
    });
    setIsLoading(false);
  }, [streamResult.data]);

  const grantConsent = useCallback(() => {
    localStorage.setItem(AI_CONSENT_KEY, 'true');
    setNeedsConsent(false);
  }, []);

  const submitArgument = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || needsConsent) return;
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() }]);
    setIsLoading(true);
    setError(null);

    try {
      let sid = sessionId;
      if (!sid) {
        const res = await startSession({ templateType: 'CHAVRUTA_DEBATE', context: { topicId: topicId ?? topic }, locale: i18n.language });
        sid = (res.data?.startAgentSession?.id as string | null) ?? null;
        if (sid) { setSessionId(sid); setSubPaused(false); }
      }
      if (sid) {
        const res = await sendAgentMessage({ sessionId: sid, content: text.trim() });
        const reply = res.data?.sendMessage;
        if (reply) {
          setMessages((prev) => [...prev, { id: reply.id as string, role: 'ai', content: reply.content as string, timestamp: new Date() }]);
          setIsLoading(false);
          return;
        }
        // Streaming response arrives via subscription; watchdog prevents infinite spinner
        timerRef.current = setTimeout(() => setIsLoading(false), 30_000);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send argument');
    }

    // Fallback mock when backend is unavailable
    timerRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: 'ai', content: pick(MOCK_RESPONSES), timestamp: new Date() }]);
      setIsLoading(false);
    }, 900);
  }, [needsConsent, sessionId, startSession, sendAgentMessage, topicId, topic]);

  const startNewTopic = useCallback(() => {
    setMessages([]);
    setTopic(pick(DEBATE_TOPICS));
    setSessionId(null);
    setSubPaused(true);
    setIsLoading(false);
    setError(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { messages, topic, isLoading, error, needsConsent, grantConsent, submitArgument, startNewTopic };
}
