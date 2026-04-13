/**
 * LiveChatMessage — renders a single chat message bubble.
 *
 * - User avatar (initials fallback) + display name + relative timestamp
 * - Pin badge if isPinned
 * - Reply thread indicator if replyToId
 * - System messages: centered, muted, italic
 * - dir="auto" for RTL support
 */
import { cn } from '@/lib/utils';
import { Pin } from 'lucide-react';
import type { LiveChatMessage as LiveChatMessageType } from '@/types/live-session.types';

interface LiveChatMessageProps {
  message: LiveChatMessageType;
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function LiveChatMessage({ message }: LiveChatMessageProps) {
  // System message — centered, muted, italic
  if (message.messageType === 'SYSTEM') {
    return (
      <div className="text-center text-xs text-muted-foreground italic py-1 px-4" dir="auto">
        {message.content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2.5 px-3 py-2 rounded-lg group',
        message.isPinned && 'bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
      )}
      data-testid="chat-message"
      data-pinned={message.isPinned}
    >
      {/* Avatar */}
      <div
        className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        aria-hidden="true"
      >
        {message.avatarUrl ? (
          <img src={message.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          initials(message.displayName)
        )}
      </div>

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {/* Header row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold truncate" dir="auto">
            {message.displayName}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(message.createdAt)}
          </span>
          {message.isPinned && (
            <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
              <Pin className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Pinned</span>
            </span>
          )}
        </div>

        {/* Reply indicator */}
        {message.replyToId && (
          <div className="text-xs text-muted-foreground border-l-2 border-muted pl-2 mb-0.5 truncate">
            ↩ Reply
          </div>
        )}

        {/* Content */}
        <p className="text-sm leading-relaxed break-words" dir="auto">
          {message.content}
        </p>
      </div>
    </div>
  );
}
