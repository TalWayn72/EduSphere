/**
 * MessageComposer — Textarea + Send button for composing discussion messages.
 */
import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ADD_MESSAGE_MUTATION } from '@/lib/graphql/discussion.queries';

interface MessageComposerProps {
  discussionId: string;
  replyToId?: string | null;
  replyToContent?: string | null;
  onReplyCleared?: () => void;
}

export default function MessageComposer({
  discussionId,
  replyToId,
  replyToContent,
  onReplyCleared,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [{ fetching }, addMessage] = useMutation(ADD_MESSAGE_MUTATION);

  const handleSubmit = async () => {
    if (!text.trim() || fetching) return;
    await addMessage(
      {
        discussionId,
        input: { content: text.trim(), parentMessageId: replyToId ?? null },
      },
      {},
    );
    setText('');
    if (replyToId && onReplyCleared) {
      onReplyCleared();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      void handleSubmit();
    }
  };

  return (
    <div className="border-t border-border pt-4 space-y-2">
      {replyToId && replyToContent && (
        <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <span className="flex-1 truncate">
            Replying to: <span className="italic">{replyToContent.slice(0, 80)}{replyToContent.length > 80 ? '…' : ''}</span>
          </span>
          {onReplyCleared && (
            <button
              onClick={onReplyCleared}
              aria-label="Clear reply"
              className="shrink-0 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          data-testid="message-composer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Ctrl+Enter to send)"
          rows={3}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          onClick={() => void handleSubmit()}
          disabled={!text.trim() || fetching}
          className="shrink-0"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
