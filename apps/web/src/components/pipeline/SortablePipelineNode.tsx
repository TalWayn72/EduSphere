/**
 * SortablePipelineNode — a single sortable pipeline node card.
 *
 * Accessible: aria-roledescription="sortable", focusable drag handle,
 * keyboard-operable via @dnd-kit KeyboardSensor.
 */
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import type { PipelineNode } from '@/lib/lesson-pipeline.store';

/** Replicate @dnd-kit/utilities CSS.Transform.toString inline. */
function transformToString(
  t: { x: number; y: number; scaleX: number; scaleY: number } | null,
): string | undefined {
  if (!t) return undefined;
  return `translate3d(${t.x}px, ${t.y}px, 0) scaleX(${t.scaleX}) scaleY(${t.scaleY})`;
}

interface Props {
  node: PipelineNode;
  idx: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function SortablePipelineNode({ node, idx, total, isSelected, onSelect, onRemove }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: transformToString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const borderClass = isSelected
    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
    : node.enabled
      ? 'border-border bg-card hover:border-blue-300'
      : 'border-border bg-muted opacity-50';

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      aria-roledescription="sortable"
      aria-label={`${node.labelHe} — מודול ${idx + 1} מתוך ${total}`}
      className={`border-2 rounded-xl p-3 transition-all ${borderClass}`}
      data-testid={`pipeline-node-${node.moduleType}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Drag handle — keyboard + pointer accessible */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`גרור ${node.labelHe}`}
          >
            <GripVertical size={16} />
          </button>
          <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0 dark:bg-blue-500 dark:text-white">
            {idx + 1}
          </span>
          <button
            type="button"
            onClick={onSelect}
            className="text-start"
            aria-label={`הגדרות ${node.labelHe}`}
          >
            <div className="text-sm font-medium">{node.labelHe}</div>
            <div className="text-xs text-muted-foreground">{node.label}</div>
          </button>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-red-500 text-xs"
          aria-label={`הסר ${node.labelHe}`}
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
