/**
 * AnnotationThread — individual annotation card with expandable thread / inline reply.
 *
 * Features (Phase 14.4):
 *  - Shows author, timestamp badge, content
 *  - Click to expand: reveals reply list + counts
 *  - Inline reply textarea that fires onReply(parentId, replyContent)
 *  - Click on the card (not reply area) fires onSeek(contentTimestamp)
 */
import { useState } from 'react';
import {
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import { LAYER_META, formatTime } from '@/pages/content-viewer.utils';

interface AnnotationThreadProps {
  annotation: Annotation;
  /** Jump the video to the annotation's timestamp */
  onSeek: (timestamp: number) => void;
  /** Add a reply to this annotation thread */
  onReply: (parentId: string, content: string, layer: AnnotationLayer) => void;
}

export function AnnotationThread({
  annotation,
  onSeek,
  onReply,
}: AnnotationThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const meta = LAYER_META[annotation.layer];
  const replyCount = annotation.replies?.length ?? 0;
  const displayTime =
    annotation.timestamp ?? formatTime(annotation.contentTimestamp ?? 0);

  const handleCardClick = () => {
    if (annotation.contentTimestamp !== undefined) {
      onSeek(annotation.contentTimestamp);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const handleSubmitReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!replyText.trim()) return;
    onReply(annotation.id, replyText.trim(), AnnotationLayer.PERSONAL);
    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <div
      className={`rounded-md border text-sm space-y-1 cursor-pointer hover:shadow-sm
                  transition-shadow ${meta?.bg ?? 'bg-muted/30'}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Annotation by ${annotation.userName} at ${displayTime}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCardClick();
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <span className={`text-xs font-semibold ${meta?.color ?? ''}`}>
          {annotation.userName ?? 'Unknown'}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {displayTime}
        </span>
      </div>

      {/* Content */}
      <p className="px-3 leading-snug">{annotation.content}</p>

      {/* Footer: expand thread + reply button */}
      <div
        className="px-3 pb-2 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {replyCount > 0 && (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground
                       hover:text-foreground transition-colors"
            aria-expanded={expanded}
          >
            <MessageSquare className="h-3 w-3" />
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowReplyInput((p) => !p);
            setExpanded(true);
          }}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground
                     transition-colors flex items-center gap-1"
        >
          <MessageSquare className="h-3 w-3" /> Reply
        </button>
      </div>

      {/* Expanded replies */}
      {expanded && replyCount > 0 && (
        <div
          className="mx-3 mb-2 border-l-2 border-current/20 pl-3 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          {annotation.replies?.map((reply) => (
            <div key={reply.id} className="text-xs text-muted-foreground">
              <span
                className={`font-semibold ${LAYER_META[reply.layer]?.color ?? ''}`}
              >
                {reply.userName}:{' '}
              </span>
              {reply.content}
            </div>
          ))}
        </div>
      )}

      {/* Inline reply input */}
      {showReplyInput && (
        <div
          className="mx-3 mb-2 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleSubmitReply(e as unknown as React.MouseEvent);
              }
              if (e.key === 'Escape') {
                setShowReplyInput(false);
                setReplyText('');
              }
            }}
            placeholder="Reply..."
            className="flex-1 text-xs px-2 py-1 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button
            size="sm"
            className="h-7 w-7 p-0 flex-shrink-0"
            onClick={handleSubmitReply}
            disabled={!replyText.trim()}
            aria-label="Send reply"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
