import React, { useState, useRef, useEffect } from 'react';
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
import { mockChatHistory } from '@/lib/mock-chat';
import type { AgentType, Message } from '@/types/chat';
import { AGENT_TYPES } from '@/types/chat';

interface AIChatPanelProps {
  className?: string;
}

export function AIChatPanel({ className }: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('chavruta');
  const [messages, setMessages] = useState<Message[]>(mockChatHistory);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    // Simulate AI response with streaming
    setTimeout(() => {
      const agentMessage: Message = {
        id: `msg-${Date.now()}-agent`,
        role: 'agent',
        content: generateMockResponse(inputValue, selectedAgent),
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, agentMessage]);

      // End streaming after 1 second
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessage.id ? { ...msg, isStreaming: false } : msg
          )
        );
        setIsStreaming(false);
      }, 1000);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentAgent = AGENT_TYPES[selectedAgent];

  return (
    <>
      {/* Toggle Button - Fixed position */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Sliding Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full md:w-[480px] bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Learning Assistant</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Agent Selector */}
        <div className="p-4 border-b bg-background">
          <label className="text-sm font-medium mb-2 block">
            Select Agent:
          </label>
          <Select
            value={selectedAgent}
            onValueChange={(value) => setSelectedAgent(value as AgentType)}
          >
            <SelectTrigger className="w-full">
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

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
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

        {/* Input Area */}
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
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isStreaming}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Generate mock AI responses based on agent type
 */
function generateMockResponse(userInput: string, agentType: AgentType): string {
  const responses: Record<AgentType, string> = {
    chavruta: `That's an interesting point! Let me challenge your thinking: Consider the **counter-argument** from Rambam's perspective.\n\nHe would say that your assumption requires us to first define what we mean by "${userInput.slice(0, 30)}..."\n\nWhat evidence supports your position?`,
    'quiz-master': `Great question! Let me test your understanding:\n\n**Question 1:** Based on your statement about "${userInput.slice(0, 30)}...", which philosophical concept does this most closely relate to?\n\nA) Epistemology\nB) Metaphysics\nC) Ethics\nD) Logic`,
    'research-scout': `I found **3 relevant sources** related to "${userInput.slice(0, 30)}...":\n\n1. **Guide for the Perplexed** (Part II, Ch. 25) - Discusses similar themes\n2. **Talmud Bavli, Berachot 33b** - Related principle\n3. **Sefer HaIkkarim** - Contemporary analysis\n\nWould you like me to explain the connections?`,
    summarizer: `Let me summarize the key points from "${userInput.slice(0, 30)}...":\n\n**Main Idea:** [Core concept]\n\n**Supporting Arguments:**\n- Point 1\n- Point 2\n- Point 3\n\n**Conclusion:** [Summary]`,
    explainer: `Great question! Let me break down "${userInput.slice(0, 30)}..." step by step:\n\n**Step 1:** First, understand the basic definition\n**Step 2:** Consider the historical context\n**Step 3:** Examine the logical implications\n\nDoes this help clarify the concept?`,
  };

  return responses[agentType];
}
