import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Annotation } from '@/types/annotations';
import { AnnotationLayer } from '@/types/annotations';

const LAYER_BADGE: Record<AnnotationLayer, { label: string; cls: string }> = {
  [AnnotationLayer.PERSONAL]: {
    label: 'Private',
    cls: 'bg-violet-100 text-violet-700',
  },
  [AnnotationLayer.SHARED]: {
    label: 'Public',
    cls: 'bg-blue-100 text-blue-700',
  },
  [AnnotationLayer.INSTRUCTOR]: {
    label: 'Authority',
    cls: 'bg-green-100 text-green-700',
  },
  [AnnotationLayer.AI_GENERATED]: {
    label: 'AI',
    cls: 'bg-amber-100 text-amber-700',
  },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface CommentCardProps {
  annotation: Annotation;
  focused: boolean;
  depth?: number;
  onFocus: (id: string) => void;
}

export function CommentCard({
  annotation,
  focused,
  depth = 0,
  onFocus,
}: CommentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const badge = LAYER_BADGE[annotation.layer];
  const truncated =
    annotation.content.length > 120 && !expanded
      ? annotation.content.slice(0, 120) + '…'
      : annotation.content;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onFocus(annotation.id)}
      onKeyDown={(e) => e.key === 'Enter' && onFocus(annotation.id)}
      className={cn(
        'rounded-lg border bg-card px-3 py-2.5 text-sm cursor-pointer transition-all',
        depth > 0 && 'ml-4 mt-1.5 border-l-2 border-l-muted',
        focused && 'ring-1 ring-primary/30 border-primary/20 bg-primary/5'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold shrink-0">
          {getInitials(annotation.userName)}
        </span>
        <span className="font-medium truncate flex-1">
          {annotation.userName}
        </span>
        <span
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
            badge.cls
          )}
        >
          {badge.label}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {relativeDate(annotation.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p className="text-foreground leading-snug whitespace-pre-wrap">
        {truncated}
        {annotation.content.length > 120 && (
          <button
            className="ml-1 text-primary text-xs underline"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? 'less' : 'more'}
          </button>
        )}
      </p>

      {/* Replies (depth=0 only to avoid infinite nesting) */}
      {depth === 0 && annotation.replies && annotation.replies.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {annotation.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              annotation={reply}
              focused={false}
              depth={1}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
