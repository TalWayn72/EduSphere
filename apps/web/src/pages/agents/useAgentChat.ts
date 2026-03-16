/**
 * useAgentChat — custom hook encapsulating all agent chat state, effects,
 * subscriptions, and message-sending logic.
 *
 * Extracted from AgentsPage to keep the page component presentation-only.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useSubscription } from 'urql';
import { useTranslation } from 'react-i18next';
import {
  START_AGENT_SESSION_MUTATION,
  SEND_AGENT_MESSAGE_MUTATION,
  MESSAGE_STREAM_SUBSCRIPTION,
  AGENT_TEMPLATES_QUERY,
} from '@/lib/graphql/agent.queries';
import { DEV_MODE } from '@/lib/auth';
import { AGENT_MODES } from './agent-modes-data';
import type { AgentModeId, ChatMsg } from './agent-modes';
import { TEMPLATE_TYPE, buildInitialSessions } from './agent-modes';

export function useAgentChat() {
  const { i18n } = useTranslation('agents');

  const [activeMode, setActiveMode] = useState<AgentModeId>('chavruta');
  const [chatInput, setChatInput] = useState('');
  const [agentSessionIds, setAgentSessionIds] = useState<
    Partial<Record<AgentModeId, string>>
  >({});
  const [sessions, setSessions] =
    useState<Record<AgentModeId, ChatMsg[]>>(buildInitialSessions);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [, startSession] = useMutation(START_AGENT_SESSION_MUTATION);
  const [, sendMessage] = useMutation(SEND_AGENT_MESSAGE_MUTATION);

  // Load real agent templates (used in non-DEV_MODE to validate template availability)
  const [templatesResult] = useQuery({
    query: AGENT_TEMPLATES_QUERY,
    pause: DEV_MODE,
  });

  const currentSessionId = agentSessionIds[activeMode] ?? null;

  // ─── Subscription: real AI streaming ──────────────────────────────────────
  const [streamResult] = useSubscription({
    query: MESSAGE_STREAM_SUBSCRIPTION,
    variables: { sessionId: currentSessionId ?? '' },
    pause: DEV_MODE || !currentSessionId,
  });

  // Handle subscription messages
  useEffect(() => {
    const msg = streamResult.data?.messageStream;
    if (!msg) return;
    setSessions((prev) => {
      const current = prev[activeMode] ?? [];
      const last = current[current.length - 1];
      if (last && last.role === 'agent' && last.id === (msg.id as string)) {
        return {
          ...prev,
          [activeMode]: [
            ...current.slice(0, -1),
            { ...last, content: msg.content as string },
          ],
        };
      }
      return {
        ...prev,
        [activeMode]: [
          ...current,
          {
            id: msg.id as string,
            role: 'agent' as const,
            content: msg.content as string,
          },
        ],
      };
    });
    setIsTyping(false);
  }, [streamResult.data, activeMode]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, streamingContent, isTyping]);

  // Cleanup on unmount — prevent timer leaks
  useEffect(() => {
    return () => {
      if (streamRef.current !== undefined) {
        clearInterval(streamRef.current);
        streamRef.current = undefined;
      }
      if (streamTimeoutRef.current !== undefined) {
        clearTimeout(streamTimeoutRef.current);
        streamTimeoutRef.current = undefined;
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!chatInput.trim() || isTyping || streamingContent) return;
    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
    };
    const capturedMode = activeMode;
    const capturedInput = chatInput;
    setChatInput('');
    setSessions((prev) => ({
      ...prev,
      [capturedMode]: [...prev[capturedMode], userMsg],
    }));

    if (!DEV_MODE) {
      setIsTyping(true);
      let gotResponse = false;
      try {
        let sessionId = agentSessionIds[capturedMode];
        if (!sessionId) {
          const res = await startSession({
            templateType: TEMPLATE_TYPE[capturedMode],
            context: { locale: i18n.language },
          });
          const newId = res.data?.startAgentSession?.id as string | undefined;
          if (newId) {
            setAgentSessionIds((prev) => ({ ...prev, [capturedMode]: newId }));
            sessionId = newId;
          }
        }
        if (sessionId) {
          const res = await sendMessage({ sessionId, content: capturedInput });
          const reply = res.data?.sendMessage;
          if (reply) {
            setSessions((prev) => ({
              ...prev,
              [capturedMode]: [
                ...prev[capturedMode],
                {
                  id: reply.id as string,
                  role: 'agent',
                  content: reply.content as string,
                },
              ],
            }));
            gotResponse = true;
          }
        }
      } finally {
        setIsTyping(false);
      }
      // GraphQL failed — fall back to mock response
      if (!gotResponse) {
        const modeData = AGENT_MODES.find((m) => m.id === capturedMode)!;
        const fullText = (
          modeData.responses[
            Math.floor(Math.random() * modeData.responses.length)
          ] ?? modeData.responses[0]) as string;
        const reply: ChatMsg = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: fullText,
        };
        setSessions((prev) => ({
          ...prev,
          [capturedMode]: [...prev[capturedMode], reply],
        }));
      }
      return;
    }

    // ── Mock / DEV_MODE path — streaming animation ──
    setIsTyping(true);
    streamTimeoutRef.current = setTimeout(() => {
      const modeData = AGENT_MODES.find((m) => m.id === capturedMode)!;
      const fullText = (
        modeData.responses[
          Math.floor(Math.random() * modeData.responses.length)
        ] ?? modeData.responses[0]) as string;
      setIsTyping(false);
      let charIdx = 0;
      setStreamingContent('');
      streamRef.current = setInterval(() => {
        charIdx += 3;
        setStreamingContent(fullText.slice(0, charIdx));
        if (charIdx >= fullText.length) {
          clearInterval(streamRef.current);
          setStreamingContent('');
          const reply: ChatMsg = {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            content: fullText,
          };
          setSessions((prev) => ({
            ...prev,
            [capturedMode]: [...prev[capturedMode], reply],
          }));
        }
      }, 18);
    }, 600);
  }, [
    chatInput,
    activeMode,
    isTyping,
    streamingContent,
    agentSessionIds,
    startSession,
    sendMessage,
    i18n.language,
  ]);

  const handleReset = () => {
    setSessions((prev) => ({ ...prev, [activeMode]: [prev[activeMode][0]!] }));
    setAgentSessionIds((prev) => {
      const next = { ...prev };
      delete next[activeMode];
      return next;
    });
  };

  const messages = sessions[activeMode];
  const hasTemplatesError = !DEV_MODE && templatesResult.error;

  if (hasTemplatesError) {
    console.error(
      '[AgentsPage] Failed to load agent templates:',
      templatesResult.error?.message
    );
  }

  return {
    activeMode,
    setActiveMode,
    chatInput,
    setChatInput,
    isTyping,
    streamingContent,
    messages,
    chatEndRef,
    hasTemplatesError,
    handleSend,
    handleReset,
  };
}
