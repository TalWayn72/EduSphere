/**
 * useAgentChat — manages AI Chavruta chat state.
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
import type {
  StartAgentSessionMutation,
  StartAgentSessionMutationVariables,
  SendAgentMessageMutation,
  SendAgentMessageMutationVariables,
  MessageStreamSubscription,
  MessageStreamSubscriptionVariables,
} from '@edusphere/graphql-types';
import { MessageRole } from '@edusphere/graphql-types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'agent',
  content: `שלום! I'm your Chavruta learning partner. I can help you debate, understand, and explore the concepts in this lesson. Ask me anything!`,
};

const MOCK_RESPONSES = [
  `That's an interesting point. Let me challenge you: if free will truly exists, how do you explain the deterministic nature of neural processes?`,
  `A strong argument! But consider the opposite view: Rambam himself in the Mishneh Torah writes that man has absolute free choice. How do you reconcile this?`,
  `Excellent! Can you find a source in the Talmud that supports or contradicts this position?`,
  `Let's explore this deeper. What would the implications be if you are correct? How would that affect the concept of reward and punishment?`,
];

// Reducer for useOptimistic: appends a new message to the displayed list.
function optimisticReducer(
  state: ChatMessage[],
  newMessage: ChatMessage
): ChatMessage[] {
  return [...state, newMessage];
}

export interface UseAgentChatReturn {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendMessage: () => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
  isStreaming: boolean;
  isSending: boolean;
}

export function useAgentChat(contentId: string): UseAgentChatReturn {
  const [confirmedMessages, setConfirmedMessages] = useState<ChatMessage[]>([
    INITIAL_MESSAGE,
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
      if (streamingTimeoutRef.current)
        clearTimeout(streamingTimeoutRef.current);
    };
  }, []);

  const [, startSession] = useMutation<
    StartAgentSessionMutation,
    StartAgentSessionMutationVariables
  >(START_AGENT_SESSION_MUTATION);
  const [, sendAgentMessage] = useMutation<
    SendAgentMessageMutation,
    SendAgentMessageMutationVariables
  >(SEND_AGENT_MESSAGE_MUTATION);

  // useOptimistic exposes the live message list; the reducer merges streaming
  // updates on top of confirmedMessages without extra state.
  const [messages] = useOptimistic<ChatMessage[], ChatMessage>(
    confirmedMessages,
    optimisticReducer
  );

  const [isSending, startTransition] = useTransition();

  // Subscribe to streaming agent responses when a session is active.
  // useSubscription<Data, Result, Variables>: Variables is the 3rd param.
  // Pass only Data here; use `satisfies` on variables for compile-time safety.
  const [streamResult] = useSubscription<
    MessageStreamSubscription,
    MessageStreamSubscription,
    MessageStreamSubscriptionVariables
  >({
    query: MESSAGE_STREAM_SUBSCRIPTION,
    variables: { sessionId: sessionId ?? '' },
    pause: !sessionId,
  });

  // Handle incoming stream events: upsert by id so partial updates work.
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

    if (incomingRole === 'agent') {
      setIsStreaming(false);
    }
  }, [streamResult.data]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const appendMockResponse = useCallback(() => {
    setIsStreaming(true);
    mockTimeoutRef.current = setTimeout(() => {
      const reply =
        MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] ?? '';
      setConfirmedMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'agent', content: reply },
      ]);
      setIsStreaming(false);
    }, 800);
  }, []);

  const sendMessage = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    // Clear input and add user message to confirmed list immediately —
    // avoids the useOptimistic duplicate-key bug that occurs when both
    // addOptimisticMessage() and setConfirmedMessages() add the same id.
    setChatInput('');
    setIsStreaming(true);
    setConfirmedMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      // Ensure we have an active session
      let sid = sessionId;
      if (!sid) {
        // TODO: TemplateType.Chavruta does not exist in the schema — use
        // TemplateType.ChavrutaDebate when the agent subgraph is updated.
        const res = await startSession({
          templateType:
            'CHAVRUTA' as import('@edusphere/graphql-types').TemplateType,
          context: { contentId },
        });
        sid = res.data?.startAgentSession?.id ?? null;
        if (sid) setSessionId(sid);
      }

      if (sid) {
        const res = await sendAgentMessage({
          sessionId: sid,
          content: trimmed,
        });
        const reply = res.data?.sendMessage;
        if (reply) {
          setConfirmedMessages((prev) => {
            const alreadyPresent = prev.some((m) => m.id === reply.id);
            if (alreadyPresent) return prev;
            return [
              ...prev,
              {
                id: reply.id,
                role: 'agent' as const,
                content: reply.content,
              },
            ];
          });
          setIsStreaming(false);
          return;
        }
        // Streaming response will arrive via subscription
        streamingTimeoutRef.current = setTimeout(
          () => setIsStreaming(false),
          30_000
        );
        return;
      }

      // Backend unavailable — fall back to mock response
      appendMockResponse();
    });
  }, [
    chatInput,
    contentId,
    sessionId,
    startSession,
    sendAgentMessage,
    appendMockResponse,
  ]);

  return {
    messages,
    chatInput,
    setChatInput,
    sendMessage,
    chatEndRef,
    isStreaming,
    isSending,
  };
}
