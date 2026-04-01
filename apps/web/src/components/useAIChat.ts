import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useSubscription } from 'urql';
import type { AgentType, Message } from '@/types/chat';
import { AGENT_TYPES } from '@/types/chat';
import {
  START_AGENT_SESSION_MUTATION,
  SEND_AGENT_MESSAGE_MUTATION,
  MESSAGE_STREAM_SUBSCRIPTION,
} from '@/lib/graphql/agent.queries';
import { generateMockResponse } from './aiChatMockResponses';

const DEV_MODE = import.meta.env.DEV;

const AGENT_TO_TEMPLATE: Record<AgentType, string> = {
  chavruta: 'CHAVRUTA_DEBATE',
  'quiz-master': 'QUIZ_ASSESS',
  'research-scout': 'RESEARCH_SCOUT',
  summarizer: 'SUMMARIZE',
  explainer: 'EXPLAIN',
};

export function useAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('chavruta');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mockTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const mockStreamRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const [, startSession] = useMutation(START_AGENT_SESSION_MUTATION);
  const [, sendMessage] = useMutation(SEND_AGENT_MESSAGE_MUTATION);
  const [streamResult] = useSubscription({
    query: MESSAGE_STREAM_SUBSCRIPTION,
    variables: { sessionId: sessionId ?? '' },
    pause: !sessionId || DEV_MODE,
  });

  const stopGeneration = () => setIsStreaming(false);

  useEffect(() => {
    return () => {
      if (mockTimerRef.current) clearTimeout(mockTimerRef.current);
      if (mockStreamRef.current) clearTimeout(mockStreamRef.current);
    };
  }, []);

  useEffect(() => {
    const msg = streamResult.data?.messageStream;
    if (!msg) return;
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === (msg as { id: string }).id);
      if (exists) {
        return prev.map((m) =>
          m.id === (msg as { id: string }).id
            ? {
                ...m,
                content: (msg as { content: string }).content,
                isStreaming: false,
              }
            : m
        );
      }
      return [
        ...prev,
        {
          id: (msg as { id: string }).id,
          role: 'agent' as const,
          content: (msg as { content: string }).content,
          timestamp: (msg as { createdAt?: string }).createdAt
            ? new Date((msg as { createdAt: string }).createdAt)
            : new Date(),
          isStreaming: false,
        },
      ];
    });
    setIsStreaming(false);
  }, [streamResult.data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    setSessionId(null);
    setMessages([]);
  }, [selectedAgent]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    if (localStorage.getItem('edusphere_consent_AI_PROCESSING') !== 'true') {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'user' as const,
          content: inputValue.trim(),
          timestamp: new Date(),
        },
        {
          id: `consent-${Date.now()}`,
          role: 'agent' as const,
          content: '',
          timestamp: new Date(),
          type: 'consent-required' as const,
        },
      ]);
      setInputValue('');
      return;
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const text = inputValue.trim();
    setInputValue('');
    setIsStreaming(true);

    if (DEV_MODE) {
      mockTimerRef.current = setTimeout(() => {
        const agentMsg: Message = {
          id: `msg-${Date.now()}-agent`,
          role: 'agent',
          content: generateMockResponse(text, selectedAgent),
          timestamp: new Date(),
          isStreaming: true,
        };
        setMessages((prev) => [...prev, agentMsg]);
        mockStreamRef.current = setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === agentMsg.id ? { ...m, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
        }, 1000);
      }, 800);
      return;
    }

    try {
      let sid = sessionId;
      if (!sid) {
        const res = await startSession({
          templateType: AGENT_TO_TEMPLATE[selectedAgent],
          context: {},
        });
        if (res.error) {
          const consentErr = res.error.graphQLErrors?.find(
            (e) => e.extensions?.code === 'CONSENT_REQUIRED'
          );
          if (consentErr) {
            setMessages((prev) => [
              ...prev,
              {
                id: `err-${Date.now()}`,
                role: 'agent' as const,
                content: '',
                timestamp: new Date(),
                type: 'consent-required' as const,
              },
            ]);
            setIsStreaming(false);
            return;
          }
        }
        sid =
          (res.data?.startAgentSession as { id?: string } | undefined)?.id ??
          null;
        if (sid) setSessionId(sid);
      }
      if (sid) {
        const res = await sendMessage({ sessionId: sid, content: text });
        if (res.error) {
          const consentErr = res.error.graphQLErrors?.find(
            (e) => e.extensions?.code === 'CONSENT_REQUIRED'
          );
          if (consentErr) {
            setMessages((prev) => [
              ...prev,
              {
                id: `err-${Date.now()}`,
                role: 'agent' as const,
                content: '',
                timestamp: new Date(),
                type: 'consent-required' as const,
              },
            ]);
            setIsStreaming(false);
            return;
          }
        }
      }
    } catch {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const currentAgent = AGENT_TYPES[selectedAgent];

  return {
    isOpen,
    setIsOpen,
    selectedAgent,
    setSelectedAgent,
    messages,
    inputValue,
    setInputValue,
    isStreaming,
    stopGeneration,
    messagesEndRef,
    inputRef,
    handleSendMessage,
    handleKeyPress,
    currentAgent,
  };
}
