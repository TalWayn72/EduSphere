/**
 * ChatPanel — chat tab for LiveLessonPage.
 *
 * - useLiveChat for messages + send/pin
 * - Pinned messages section at top
 * - Message list with auto-scroll to bottom
 * - LiveChatInput at bottom
 * - aria-live="polite" on message container
 */
import { useEffect, useRef } from 'react';
import { Pin } from 'lucide-react';
import { LiveChatMessage } from '@/components/live/LiveChatMessage';
import { LiveChatInput } from '@/components/live/LiveChatInput';
import { useLiveChat } from '@/hooks/useLiveChat';

interface ChatPanelProps {
  sessionId: string;
}

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const { messages, sendMessage } = useLiveChat(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const pinned = messages.filter((m) => m.isPinned);
  const regular = messages.filter((m) => !m.isPinned || m.messageType === 'SYSTEM');

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="chat-panel">
      {/* Pinned messages */}
      {pinned.length > 0 && (
        <div className="border-b px-3 py-2 bg-amber-50/40 dark:bg-amber-900/10 shrink-0">
          <div className="flex items-center gap-1 mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Pin className="h-3 w-3" aria-hidden="true" />
            Pinned
          </div>
          <div className="space-y-1">
            {pinned.map((msg) => (
              <LiveChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      )}

      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto py-2 space-y-0.5"
        aria-live="polite"
        aria-label="Chat messages"
        aria-atomic="false"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <p dir="auto">No messages yet. Be the first!</p>
          </div>
        )}

        {regular.map((msg) => (
          <LiveChatMessage key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Input */}
      <LiveChatInput onSend={sendMessage} />
    </div>
  );
}
