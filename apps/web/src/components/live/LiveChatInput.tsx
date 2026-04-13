/**
 * LiveChatInput — chat text input with send button.
 *
 * - Enter to send, Shift+Enter for newline
 * - Reply indicator bar with cancel button
 * - Reads replyToMessageId from store
 */
import { useState, useCallback, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLiveSessionStore } from '@/stores/live-session.store';

interface LiveChatInputProps {
  onSend: (content: string, replyToId?: string) => Promise<void>;
  replyToDisplay?: string;
}

export function LiveChatInput({ onSend, replyToDisplay }: LiveChatInputProps) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const { replyToMessageId, clearReplyTo } = useLiveSessionStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed, replyToMessageId ?? undefined);
      setValue('');
      clearReplyTo();
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [value, sending, onSend, replyToMessageId, clearReplyTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-2 flex flex-col gap-1.5">
      {/* Reply indicator */}
      {replyToMessageId && (
        <div className="flex items-center justify-between px-2 py-1 bg-muted/60 rounded text-xs text-muted-foreground">
          <span dir="auto">↩ {replyToDisplay ?? 'Replying…'}</span>
          <button
            type="button"
            onClick={clearReplyTo}
            className="ml-2 hover:text-foreground transition-colors"
            aria-label="Cancel reply"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הקלד הודעה…"
          rows={1}
          className="resize-none min-h-0 flex-1 text-sm"
          dir="auto"
          aria-label="Chat message"
          disabled={sending}
        />
        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={() => {
            void handleSend();
          }}
          disabled={!value.trim() || sending}
          aria-label="Send message"
          className="h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
