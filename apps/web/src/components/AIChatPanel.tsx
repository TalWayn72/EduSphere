import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useSubscription } from 'urql';
import { cn } from '@/lib/utils';
import { X, Send, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChatMessage } from '@/components/ChatMessage';
import type { AgentType, Message } from '@/types/chat';
import { AGENT_TYPES } from '@/types/chat';
import {
  START_AGENT_SESSION_MUTATION,
  SEND_AGENT_MESSAGE_MUTATION,
  MESSAGE_STREAM_SUBSCRIPTION,
} from '@/lib/graphql/agent.queries';

const DEV_MODE = import.meta.env.DEV;

const AGENT_TO_TEMPLATE: Record<AgentType, string> = {
  chavruta: 'CHAVRUTA_DEBATE',
  'quiz-master': 'QUIZ_ASSESS',
  'research-scout': 'RESEARCH_SCOUT',
  summarizer: 'SUMMARIZE',
  explainer: 'EXPLAIN',
};

interface AIChatPanelProps {
  className?: string;
}

export function AIChatPanel({ className }: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('chavruta');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const stopGeneration = () => {
    setIsStreaming(false);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mockTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const mockStreamRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const { t } = useTranslation('agents');

  const [, startSession] = useMutation(START_AGENT_SESSION_MUTATION);
  const [, sendMessage] = useMutation(SEND_AGENT_MESSAGE_MUTATION);
  const [streamResult] = useSubscription({
    query: MESSAGE_STREAM_SUBSCRIPTION,
    variables: { sessionId: sessionId ?? '' },
    pause: !sessionId || DEV_MODE,
  });

  // Cleanup mock timers on unmount
  useEffect(() => {
    return () => {
      if (mockTimerRef.current) clearTimeout(mockTimerRef.current);
      if (mockStreamRef.current) clearTimeout(mockStreamRef.current);
    };
  }, []);

  // Handle streaming subscription results
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
          timestamp: new Date((msg as { createdAt: string }).createdAt),
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

  // Reset session when agent type changes
  useEffect(() => {
    setSessionId(null);
    setMessages([]);
  }, [selectedAgent]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

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
        sid =
          (res.data?.startAgentSession as { id?: string } | undefined)?.id ??
          null;
        if (sid) setSessionId(sid);
      }
      if (sid) {
        await sendMessage({ sessionId: sid, content: text });
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

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          size="icon"
          aria-label="Open AI chat"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full md:w-[480px] bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('chatPanel.title')}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
            aria-label="Close AI chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 border-b bg-background">
          <label
            htmlFor="ai-agent-select"
            className="text-sm font-medium mb-2 block"
          >
            {t('selectAgent')}
          </label>
          <Select
            value={selectedAgent}
            onValueChange={(v) => setSelectedAgent(v as AgentType)}
          >
            <SelectTrigger
              id="ai-agent-select"
              className="w-full"
              aria-label={t('selectAgent')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AGENT_TYPES).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span>{agent.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {agent.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {t('chatPanel.startConversation')}
              </p>
              <p className="text-sm max-w-xs">
                Ask me anything about {currentAgent.name.toLowerCase()} topics!
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  agentName={currentAgent.name}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${currentAgent.name}...`}
              disabled={isStreaming}
              className="flex-1"
            />
            {isStreaming ? (
              <Button
                variant="outline"
                size="sm"
                onClick={stopGeneration}
                className="shrink-0"
                aria-label="Stop generation"
              >
                &#9632; Stop
              </Button>
            ) : (
              <Button
                onClick={() => void handleSendMessage()}
                disabled={!inputValue.trim()}
                size="icon"
                className="shrink-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('chatPanel.inputHint')}
          </p>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function generateMockResponse(userInput: string, agentType: AgentType): string {
  const preview = userInput.slice(0, 30);
  const responses: Record<AgentType, string> = {
    chavruta: `That's an interesting point! Consider the **counter-argument** from Rambam's perspective.\n\nHe would say that your assumption about "${preview}..." requires a deeper definition first.\n\nWhat evidence supports your position?`,
    'quiz-master': `Let me test your understanding:\n\n**Question:** Based on "${preview}...", which concept does this most closely relate to?\n\nA) Epistemology\nB) Metaphysics\nC) Ethics\nD) Logic`,
    'research-scout': `Found **3 relevant sources** for "${preview}...":\n\n1. **Guide for the Perplexed** (Part II, Ch. 25)\n2. **Talmud Bavli, Berachot 33b**\n3. **Sefer HaIkkarim**\n\nWould you like me to explain the connections?`,
    summarizer: `Key points from "${preview}...":\n\n**Main Idea:** Core concept\n\n**Supporting Arguments:**\n- Point 1\n- Point 2\n\n**Conclusion:** Summary`,
    explainer: `Let me break down "${preview}..." step by step:\n\n**Step 1:** Basic definition\n**Step 2:** Historical context\n**Step 3:** Logical implications\n\nDoes this help clarify?`,
  };
  return responses[agentType];
}
