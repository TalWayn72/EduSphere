/** DebateInterface — Chavruta debate UI. AI messages carry EU AI Act Art.50 badge. */
import React, { useRef, useEffect, useCallback } from 'react';
import { Send, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { DebateMessage } from '@/hooks/useChavrutaDebate';

export interface DebateInterfaceProps {
  topic: string;
  messages: DebateMessage[];
  onSubmit: (text: string) => Promise<void>;
  isLoading: boolean;
}

function AIDisclosureBadge() {
  return (
    <span
      className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border border-muted-foreground/30 text-muted-foreground"
      aria-label="Generated with AI assistance"
    >
      <Bot className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
      AI
    </span>
  );
}

function MessageBubble({ message }: { message: DebateMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-xs text-muted-foreground font-medium">Chavruta AI</span>
            <AIDisclosureBadge />
          </div>
        )}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>
        <time className="text-[10px] text-muted-foreground/60 px-1" dateTime={message.timestamp.toISOString()}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }} aria-hidden="true" />
        ))}
        <span className="sr-only">AI is composing a response</span>
      </div>
    </div>
  );
}

export function DebateInterface({ topic, messages, onSubmit, isLoading }: DebateInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = React.useState('');

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    setInputValue('');
    await onSubmit(trimmed);
  }, [inputValue, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); void handleSubmit(); }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Debate Topic</p>
        <p className="text-sm font-semibold mt-0.5 leading-snug">{topic}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Present your opening argument to begin the debate.
          </p>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {isLoading && <TypingIndicator />}
        <div ref={scrollRef} />
      </div>

      <div className="px-4 py-3 border-t">
        <div className="flex gap-2 items-end">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="State your argument… (Ctrl+Enter to submit)"
            disabled={isLoading}
            rows={2}
            className="flex-1 resize-none text-sm"
          />
          <Button size="icon" onClick={() => void handleSubmit()}
            disabled={!inputValue.trim() || isLoading}
            className="shrink-0 h-10 w-10" aria-label="Submit argument">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Ctrl+Enter to submit · Generated with AI assistance (EU AI Act Art. 50)
        </p>
      </div>
    </div>
  );
}
