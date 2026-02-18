import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import type { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
  agentName?: string;
}

/**
 * Simple markdown renderer for chat messages
 * Supports: **bold**, *italic*, `code`, and numbered lists
 */
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Match markdown patterns
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
    { regex: /\*([^*]+)\*/g, type: 'italic' },
    { regex: /`([^`]+)`/g, type: 'code' },
  ];

  const matches: Array<{ start: number; end: number; type: string; content: string }> = [];

  patterns.forEach(({ regex, type }) => {
    let match;
    const tempRegex = new RegExp(regex);
    while ((match = tempRegex.exec(text)) !== null) {
      if (match[1]) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type,
          content: match[1],
        });
      }
    }
  });

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build rendered output
  matches.forEach((match, idx) => {
    // Add text before match
    if (match.start > currentIndex) {
      parts.push(text.slice(currentIndex, match.start));
    }

    // Add formatted match
    const key = `${match.type}-${idx}`;
    if (match.type === 'bold') {
      parts.push(<strong key={key}>{match.content}</strong>);
    } else if (match.type === 'italic') {
      parts.push(<em key={key}>{match.content}</em>);
    } else if (match.type === 'code') {
      parts.push(
        <code key={key} className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
          {match.content}
        </code>
      );
    }

    currentIndex = match.end;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function ChatMessage({ message, agentName = 'AI Agent' }: ChatMessageProps) {
  const isAgent = message.role === 'agent';

  // Split by paragraphs for better formatting
  const paragraphs = message.content.split('\n\n');

  return (
    <div
      className={cn(
        'flex gap-3 py-4 px-4 rounded-lg transition-colors',
        isAgent ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border',
          isAgent
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary text-secondary-foreground border-border'
        )}
      >
        {isAgent ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isAgent ? agentName : 'You'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="text-sm text-foreground space-y-2">
          {paragraphs.map((paragraph, idx) => (
            <p key={idx} className="leading-relaxed">
              {renderMarkdown(paragraph)}
            </p>
          ))}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse rounded" />
          )}
        </div>
      </div>
    </div>
  );
}
