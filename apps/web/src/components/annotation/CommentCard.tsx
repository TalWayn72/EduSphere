/**
 * CommentCard — MS-Word style comment card for the document annotation panel.
 * Shows author, layer badge, comment text with expand/collapse, and threaded replies.
 */
import { useState } from 'react';
import { MessageSquare, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ANNOTATION_LAYER_CONFIGS,
  type Annotation,
  AnnotationLayer,
} from '@/types/annotations';

export interface CommentCardProps {
  annotation: Annotation;
  isFocused: boolean;
  onFocus: (id: string) => void;
  onReply?: (id: string) => void;
  onResolve?: (id: string) => void;
  depth?: number; // 0 = root, 1 = reply
}

const LAYER_BADGE_CLASS: Record<AnnotationLayer, string> = {
  [AnnotationLayer.PERSONAL]: 'bg-violet-100 text-violet-700',
  [AnnotationLayer.SHARED]: 'bg-blue-100 text-blue-700',
  [AnnotationLayer.INSTRUCTOR]: 'bg-green-100 text-green-700',
  [AnnotationLayer.AI_GENERATED]: 'bg-orange-100 text-orange-700',
};

const TRUNCATE_THRESHOLD = 120;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CommentCard({
  annotation,
  isFocused,
  onFocus,
  onReply,
  onResolve,
  depth = 0,
}: CommentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);

  const layerConfig = ANNOTATION_LAYER_CONFIGS[annotation.layer];
  const replies = annotation.replies ?? [];
  const isLong = annotation.content.length > TRUNCATE_THRESHOLD;
  const displayText =
    !isLong || expanded
      ? annotation.content
      : annotation.content.slice(0, TRUNCATE_THRESHOLD) + '\u2026';

  return (
    <div
      role="article"
      aria-label={`Comment by ${annotation.userName}`}
      className={cn(
        'group relative rounded-md border p-3 transition-all cursor-pointer',
        depth === 0 ? 'mb-2' : 'mb-1 ml-4 mt-1 bg-muted/50',
        isFocused
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-card hover:bg-accent/40'
      )}
      onClick={() => onFocus(annotation.id)}
    >
      {/* Header: avatar + name + date */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {getInitials(annotation.userName)}
        </div>
        <span className="text-xs font-medium text-foreground truncate">
          {annotation.userName}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
          {relativeDate(annotation.createdAt)}
        </span>
      </div>

      {/* Layer badge */}
      <span
        className={cn(
          'inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold mb-1.5',
          LAYER_BADGE_CLASS[annotation.layer]
        )}
      >
        {layerConfig.icon} {layerConfig.label}
      </span>

      {/* Comment text */}
      <p className="text-sm text-foreground leading-snug">{displayText}</p>
      {isLong && (
        <button
          className="text-[10px] text-primary mt-0.5 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? 'show less' : 'show more'}
        </button>
      )}

      {/* Footer: reply + resolve + reply-count toggle */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onReply && depth === 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              onReply(annotation.id);
            }}
          >
            <MessageSquare className="h-3 w-3 mr-0.5" /> Reply
          </Button>
        )}
        {onResolve && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[10px] text-green-600 hover:text-green-700"
            onClick={(e) => {
              e.stopPropagation();
              onResolve(annotation.id);
            }}
          >
            <Check className="h-3 w-3 mr-0.5" /> Resolve
          </Button>
        )}
        {replies.length > 0 && (
          <button
            className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setRepliesOpen(!repliesOpen);
            }}
          >
            <MessageSquare className="h-3 w-3" />
            {replies.length}
            {repliesOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Inline threaded replies */}
      {repliesOpen &&
        replies.map((reply) => (
          <CommentCard
            key={reply.id}
            annotation={reply}
            isFocused={false}
            onFocus={onFocus}
            depth={1}
          />
        ))}
    </div>
  );
}
