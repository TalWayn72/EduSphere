import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Users, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from './LiveSessionDetailPage.types';

interface ChatSidebarProps {
  isLive: boolean;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  participantCount: number;
}

export function ChatSidebar({
  isLive,
  messages,
  onSend,
  participantCount,
}: ChatSidebarProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <aside className="flex flex-col h-full border-l" data-testid="chat-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="font-semibold text-sm flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" aria-hidden />
          Live Chat
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" aria-hidden />
          {participantCount}
        </span>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            No messages yet. Be the first to say hello!
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {m.displayName[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-xs font-medium">{m.displayName}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(m.sentAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-sm ml-7 leading-snug">{m.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t flex gap-2 shrink-0">
        <input
          className="flex-1 text-sm px-3 py-1.5 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          placeholder={isLive ? 'Type a message...' : 'Session ended'}
          value={input}
          disabled={!isLive}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          data-testid="chat-input"
        />
        <Button
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleSend}
          disabled={!isLive || !input.trim()}
          aria-label="Send message"
          data-testid="chat-send-btn"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
