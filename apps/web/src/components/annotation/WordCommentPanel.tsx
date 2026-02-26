import React, { useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CommentCard } from './CommentCard';
import { useUIStore } from '@/lib/store';
import type { Annotation } from '@/types/annotations';
import { AnnotationLayer } from '@/types/annotations';
import { cn } from '@/lib/utils';

const FILTER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: AnnotationLayer.PERSONAL, label: 'Private' },
  { key: AnnotationLayer.SHARED, label: 'Public' },
  { key: AnnotationLayer.INSTRUCTOR, label: 'Authority' },
  { key: AnnotationLayer.AI_GENERATED, label: 'AI' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

interface Props {
  annotations: Annotation[];
  selectionActive: boolean;
  onAddComment: () => void;
}

export function WordCommentPanel({
  annotations,
  selectionActive,
  onAddComment,
}: Props) {
  const [activeFilter, setActiveFilter] = React.useState<FilterKey>('ALL');
  const { focusedAnnotationId, setFocusedAnnotationId } = useUIStore();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to focused card whenever it changes
  useEffect(() => {
    if (!focusedAnnotationId) return;
    const el = cardRefs.current.get(focusedAnnotationId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedAnnotationId]);

  const filtered =
    activeFilter === 'ALL'
      ? annotations
      : annotations.filter((a) => a.layer === activeFilter);

  // Sort by text range position (from), then by creation date
  const sorted = [...filtered].sort((a, b) => {
    const aFrom = a.textRange?.from ?? Infinity;
    const bFrom = b.textRange?.from ?? Infinity;
    if (aFrom !== bFrom) return aFrom - bFrom;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const topLevel = sorted.filter((a) => !a.parentId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-sm font-semibold">
          Comments ({annotations.length})
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={!selectionActive}
          onClick={onAddComment}
          className="h-7 gap-1 text-xs"
          data-testid="add-comment-panel-btn"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b shrink-0 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'px-2 py-0.5 text-xs rounded-md whitespace-nowrap transition-colors',
              activeFilter === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comment list */}
      <ScrollArea className="flex-1 px-2 py-2">
        {topLevel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No comments yet.</p>
            <p className="text-xs mt-1">
              Select text in the document to add a comment.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topLevel.map((ann) => (
              <div
                key={ann.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(ann.id, el);
                  else cardRefs.current.delete(ann.id);
                }}
              >
                <CommentCard
                  annotation={ann}
                  focused={focusedAnnotationId === ann.id}
                  onFocus={setFocusedAnnotationId}
                />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
