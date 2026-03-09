/**
 * MessageItem — Renders a single discussion message with like and reply actions.
 */
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { ThumbsUp, CornerDownRight } from 'lucide-react';
import { LIKE_MESSAGE_MUTATION } from '@/lib/graphql/discussion.queries';

interface Message {
  id: string;
  userId: string;
  content: string;
  parentMessageId?: string | null;
  likesCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

interface MessageItemProps {
  message: Message;
  onReply: (id: string, content: string) => void;
  indent?: number;
  displayName?: string;
}

function getInitials(displayName?: string): string {
  if (!displayName) return '?';
  const parts = displayName.trim().split(/\s+/);
  return parts[0]?.[0]?.toUpperCase() ?? '?';
}

export default function MessageItem({
  message,
  onReply,
  indent = 0,
  displayName,
}: MessageItemProps) {
  const [{ fetching }, likeMessage] = useMutation(LIKE_MESSAGE_MUTATION);

  const handleLike = () => {
    void likeMessage({ messageId: message.id }, {});
  };

  const formattedDate = new Date(message.createdAt).toLocaleDateString();

  return (
    <div className={`flex gap-3 ${indent > 0 ? 'ml-8' : ''}`}>
      {/* Avatar */}
      <div
        className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
        aria-hidden
      >
        {getInitials(displayName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {displayName && (
            <span className="text-sm font-medium text-foreground">{displayName}</span>
          )}
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={fetching}
            aria-label={`Like message (${message.likesCount} likes)`}
            className={`h-7 px-2 text-xs gap-1 ${message.isLikedByMe ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <ThumbsUp className="h-3 w-3" aria-hidden />
            {message.likesCount > 0 && <span>{message.likesCount}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReply(message.id, message.content)}
            aria-label="Reply to message"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
          >
            <CornerDownRight className="h-3 w-3" aria-hidden />
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
