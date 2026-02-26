/**
 * WordCommentPanel — MS-Word style right-side comment panel.
 * Displays CommentCard list sorted by position, with layer filter tabs and Add button.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageSquarePlus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CommentCard } from '@/components/annotation/CommentCard';
import {
  AnnotationLayer,
  ANNOTATION_LAYER_CONFIGS,
  type Annotation,
} from '@/types/annotations';

type LayerFilter = AnnotationLayer | 'ALL';

export interface WordCommentPanelProps {
  annotations: Annotation[];
  focusedAnnotationId: string | null;
  onFocusAnnotation: (id: string | null) => void;
  onAddComment: () => void;
  onReply?: (id: string) => void;
  onResolve?: (id: string) => void;
  selectionActive: boolean;
}

const LAYER_FILTERS: Array<{ value: LayerFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  {
    value: AnnotationLayer.PERSONAL,
    label: ANNOTATION_LAYER_CONFIGS[AnnotationLayer.PERSONAL].label,
  },
  {
    value: AnnotationLayer.SHARED,
    label: ANNOTATION_LAYER_CONFIGS[AnnotationLayer.SHARED].label,
  },
  {
    value: AnnotationLayer.INSTRUCTOR,
    label: ANNOTATION_LAYER_CONFIGS[AnnotationLayer.INSTRUCTOR].label,
  },
  {
    value: AnnotationLayer.AI_GENERATED,
    label: ANNOTATION_LAYER_CONFIGS[AnnotationLayer.AI_GENERATED].label,
  },
];

export function WordCommentPanel({
  annotations,
  focusedAnnotationId,
  onFocusAnnotation,
  onAddComment,
  onReply,
  onResolve,
  selectionActive,
}: WordCommentPanelProps) {
  const [activeFilter, setActiveFilter] = useState<LayerFilter>('ALL');
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll focused card into view
  useEffect(() => {
    if (!focusedAnnotationId) return;
    const el = cardRefs.current.get(focusedAnnotationId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedAnnotationId]);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  const filteredAnnotations =
    activeFilter === 'ALL'
      ? annotations
      : annotations.filter((a) => a.layer === activeFilter);

  // CommentCard.onFocus is (id: string); bridge to panel's (id: string | null) API.
  const handleFocus = useCallback(
    (id: string) => {
      onFocusAnnotation(id);
    },
    [onFocusAnnotation]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 border-b px-3 py-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground flex-1">
          Comments
        </span>
        <span className="text-xs text-muted-foreground">
          {annotations.length}
        </span>
        <Button
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={onAddComment}
          disabled={!selectionActive}
          title={
            selectionActive
              ? 'Add comment for selected text'
              : 'Select text first'
          }
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Layer filter tabs */}
      <div className="shrink-0 border-b px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
        {LAYER_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveFilter(value)}
            className={cn(
              'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
              activeFilter === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-muted-foreground">
              {selectionActive
                ? 'Click \u201cAdd\u201d to comment on the selected text'
                : 'Select text in the document to add a comment'}
            </p>
          </div>
        ) : (
          filteredAnnotations.map((ann) => (
            <div key={ann.id} ref={(el) => setCardRef(ann.id, el)}>
              <CommentCard
                annotation={ann}
                isFocused={focusedAnnotationId === ann.id}
                onFocus={handleFocus}
                onReply={onReply}
                onResolve={onResolve}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
