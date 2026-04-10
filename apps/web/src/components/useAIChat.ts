/**
 * useAIChat — floating AI chat panel state.
 *
 * Panel-level UI concerns (open/close, selectedAgent, inputRef, messagesEndRef)
 * are managed here. Message sending is delegated to the shared useAgentChat
 * hook from @/hooks/useAgentChat so both the floating panel and the /agents
 * page use the same session management and GraphQL mutations.
 *
 * ChatMessage (from hooks) is mapped to Message (types/chat) by adding a
 * synthetic timestamp so ChatMessage.tsx receives the full Message interface.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { AgentType, Message } from '@/types/chat';
import { AGENT_TYPES } from '@/types/chat';
import { useAgentChat } from '@/hooks/useAgentChat';
import type { ChatMode } from '@/hooks/useAgentChat';

/** Map floating-panel AgentType → shared ChatMode */
const AGENT_TO_MODE: Record<AgentType, ChatMode> = {
  chavruta: 'CHAVRUTA',
  'quiz-master': 'QUIZ',
  'research-scout': 'CHAVRUTA',
  summarizer: 'EXPLAIN',
  explainer: 'EXPLAIN',
};

const SESSION_START = new Date();

export function useAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('chavruta');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages: rawMessages,
    chatInput: inputValue,
    setChatInput: setInputValue,
    sendMessage: sendShared,
    stopGeneration,
    isStreaming,
    setMode,
  } = useAgentChat('', AGENT_TO_MODE[selectedAgent]);

  // Sync mode when selected agent changes
  useEffect(() => {
    setMode(AGENT_TO_MODE[selectedAgent]);
  }, [selectedAgent, setMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawMessages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Map ChatMessage → Message (add synthetic timestamp for ChatMessage component)
  const messages = useMemo<Message[]>(
    () =>
      rawMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: SESSION_START,
      })),
    [rawMessages]
  );

  const handleSendMessage = useCallback(async () => {
    sendShared();
  }, [sendShared]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendShared();
      }
    },
    [sendShared]
  );

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
