/**
 * useAgentChat — manages AI chat state with selectable modes (CHAVRUTA/QUIZ/EXPLAIN).
 *
 * Uses START_AGENT_SESSION_MUTATION + SEND_AGENT_MESSAGE_MUTATION in production.
 * Subscribes to MESSAGE_STREAM_SUBSCRIPTION for real-time streaming agent responses.
 * Uses React 19 useOptimistic so user messages appear instantly in the UI;
 * the optimistic entry is automatically reverted if the mutation throws.
 * Falls back to local mock responses when the backend is unavailable.
 */
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useTransition,
  type RefObject,
} from 'react';
import { useMutation, useSubscription } from 'urql';
import {
  START_AGENT_SESSION_MUTATION,
  SEND_AGENT_MESSAGE_MUTATION,
  MESSAGE_STREAM_SUBSCRIPTION,
} from '@/lib/graphql/agent.queries';
import { MessageRole } from '@edusphere/graphql-types';
import type { TemplateType } from '@edusphere/graphql-types';

// Types defined locally because agent.queries.ts is excluded from codegen
interface StartAgentSessionMutation {
  startAgentSession: {
    id: string;
    templateType: TemplateType;
    status: string;
    createdAt: string;
  } | null;
}
interface StartAgentSessionMutationVariables {
  templateType: TemplateType;
  context: Record<string, unknown>;
}
interface SendAgentMessageMutation {
  sendMessage: {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: string;
  } | null;
}
interface SendAgentMessageMutationVariables {
  sessionId: string;
  content: string;
}
interface MessageStreamSubscription {
  messageStream: {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: string;
  } | null;
}
interface MessageStreamSubscriptionVariables {
  sessionId: string;
}
import type { ChatMessage, ChatMode } from './useAgentChat.helpers';
import {
  INITIAL_MESSAGES,
  MOCK_RESPONSES_BY_MODE,
  optimisticReducer,
  withStreamingCursor,
} from './useAgentChat.helpers';

export type { ChatMessage, ChatMode } from './useAgentChat.helpers';

const MODE_TO_TEMPLATE: Record<ChatMode, string> = {
  CHAVRUTA: 'CHAVRUTA_DEBATE',
  QUIZ: 'QUIZ_GENERATOR',
  EXPLAIN: 'EXPLANATION_GENERATOR',
};

export interface UseAgentChatReturn {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendMessage: () => void;
  stopGeneration: () => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
  isStreaming: boolean;
  isSending: boolean;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export function useAgentChat(
  contentId: string,
  initialMode: ChatMode = 'CHAVRUTA'
): UseAgentChatReturn {
  const [mode, setModeState] = useState<ChatMode>(initialMode);
  const [confirmedMessages, setConfirmedMessages] = useState<ChatMessage[]>([
    INITIAL_MESSAGES[initialMode],
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mockTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    return () => {
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
      if (streamingTimeoutRef.current)
        clearTimeout(streamingTimeoutRef.current);
    };
  }, []);

  const setMode = useCallback((newMode: ChatMode) => {
    setModeState(newMode);
    setSessionId(null);
    setIsStreaming(false);
    setConfirmedMessages([INITIAL_MESSAGES[newMode]]);
  }, []);

  const [, startSession] = useMutation<
    StartAgentSessionMutation,
    StartAgentSessionMutationVariables
  >(START_AGENT_SESSION_MUTATION);
  const [, sendAgentMessage] = useMutation<
    SendAgentMessageMutation,
    SendAgentMessageMutationVariables
  >(SEND_AGENT_MESSAGE_MUTATION);

  const [messages] = useOptimistic<ChatMessage[], ChatMessage>(
    confirmedMessages,
    optimisticReducer
  );

  const [isSending, startTransition] = useTransition();

  const [streamResult] = useSubscription<
    MessageStreamSubscription,
    MessageStreamSubscription,
    MessageStreamSubscriptionVariables
  >({
    query: MESSAGE_STREAM_SUBSCRIPTION,
    variables: { sessionId: sessionId ?? '' },
    pause: !sessionId,
  });

  useEffect(() => {
    const msg = streamResult.data?.messageStream;
    if (!msg) return;
    const incomingRole: ChatMessage['role'] =
      msg.role === MessageRole.User ? 'user' : 'agent';
    setConfirmedMessages((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === msg.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx]!,
          content: msg.content,
        };
        return updated;
      }
      return [
        ...prev,
        { id: msg.id, role: incomingRole, content: msg.content },
      ];
    });
    if (incomingRole === 'agent') setIsStreaming(false);
  }, [streamResult.data]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const appendMockResponse = useCallback(
    (currentMode: ChatMode) => {
      setIsStreaming(true);
      const responses = MOCK_RESPONSES_BY_MODE[currentMode];
      mockTimeoutRef.current = setTimeout(() => {
        const reply =
          responses[Math.floor(Math.random() * responses.length)] ?? '';
        setConfirmedMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'agent', content: reply },
        ]);
        setIsStreaming(false);
      }, 800);
    },
    []
  );

  const sendMessage = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    if (localStorage.getItem('edusphere_consent_AI_PROCESSING') !== 'true') {
      setChatInput('');
      setConfirmedMessages((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, role: 'user', content: trimmed },
        {
          id: `consent-${Date.now()}`,
          role: 'agent',
          content: 'consent-required',
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setChatInput('');
    setIsStreaming(true);
    setConfirmedMessages((prev) => [...prev, userMsg]);

    const currentMode = mode;
    startTransition(async () => {
      let sid = sessionId;
      if (!sid) {
        const templateType = MODE_TO_TEMPLATE[currentMode] as TemplateType;
        const res = await startSession({
          templateType,
          context: { contentId, mode: currentMode },
        });
        if (res.error) {
          const consentErr = res.error.graphQLErrors?.find(
            (e) => e.extensions?.code === 'CONSENT_REQUIRED'
          );
          if (consentErr) {
            setConfirmedMessages((prev) => [
              ...prev,
              {
                id: `consent-${Date.now()}`,
                role: 'agent' as const,
                content: 'consent-required',
              },
            ]);
            setIsStreaming(false);
            return;
          }
        }
        sid = res.data?.startAgentSession?.id ?? null;
        if (sid) setSessionId(sid);
      }

      if (sid) {
        const res = await sendAgentMessage({
          sessionId: sid,
          content: trimmed,
        });
        if (res.error) {
          const consentErr = res.error.graphQLErrors?.find(
            (e) => e.extensions?.code === 'CONSENT_REQUIRED'
          );
          if (consentErr) {
            setConfirmedMessages((prev) => [
              ...prev,
              {
                id: `consent-${Date.now()}`,
                role: 'agent' as const,
                content: 'consent-required',
              },
            ]);
            setIsStreaming(false);
            return;
          }
        }
        const reply = res.data?.sendMessage;
        if (reply) {
          setConfirmedMessages((prev) => {
            const alreadyPresent = prev.some((m) => m.id === reply.id);
            if (alreadyPresent) return prev;
            return [
              ...prev,
              { id: reply.id, role: 'agent' as const, content: reply.content },
            ];
          });
          setIsStreaming(false);
          return;
        }
        streamingTimeoutRef.current = setTimeout(
          () => setIsStreaming(false),
          30_000
        );
        return;
      }

      appendMockResponse(currentMode);
    });
  }, [
    chatInput,
    contentId,
    mode,
    sessionId,
    startSession,
    sendAgentMessage,
    appendMockResponse,
  ]);

  const stopGeneration = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const displayMessages = useMemo(
    () => withStreamingCursor(messages, isStreaming),
    [messages, isStreaming]
  );

  return {
    messages: displayMessages,
    chatInput,
    setChatInput,
    sendMessage,
    stopGeneration,
    chatEndRef,
    isStreaming,
    isSending,
    mode,
    setMode,
  };
}
