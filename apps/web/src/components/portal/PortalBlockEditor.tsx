/**
 * PortalBlockEditor — Phase 63 (No-Code Portal Builder).
 *
 * Drag-drop block editor for tenant portal configuration.
 * Uses @dnd-kit/sortable for block reordering.
 * Each block: type + props (text, colors, button labels).
 *
 * JSON schema: { blocks: [{id, type, props}] }
 */
import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2, Plus } from 'lucide-react';

export type BlockType = 'hero' | 'courses' | 'features' | 'cta' | 'testimonials';

export interface PortalBlock {
  id: string;
  type: BlockType;
  props: {
    title?: string;
    subtitle?: string;
    buttonLabel?: string;
    backgroundColor?: string;
  };
}

export interface PortalConfig {
  blocks: PortalBlock[];
}

const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Hero Banner',
  courses: 'Featured Courses',
  features: 'Features Grid',
  cta: 'Call to Action',
  testimonials: 'Testimonials',
};

const BLOCK_COLORS: Record<BlockType, string> = {
  hero: 'bg-indigo-50 border-indigo-200',
  courses: 'bg-emerald-50 border-emerald-200',
  features: 'bg-sky-50 border-sky-200',
  cta: 'bg-amber-50 border-amber-200',
  testimonials: 'bg-rose-50 border-rose-200',
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Replicate @dnd-kit/utilities CSS.Transform.toString without the package. */
function transformToString(
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null
): string | undefined {
  if (!transform) return undefined;
  const { x, y, scaleX, scaleY } = transform;
  return `translate3d(${x}px, ${y}px, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
}

interface SortableBlockProps {
  block: PortalBlock;
  onUpdate: (id: string, props: Partial<PortalBlock['props']>) => void;
  onRemove: (id: string) => void;
}

function SortableBlock({ block, onUpdate, onRemove }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: transformToString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-3 rounded-lg border ${BLOCK_COLORS[block.type]} cursor-default`}
      data-testid={`block-${block.id}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab text-gray-400 hover:text-gray-600"
        aria-label={`Drag ${BLOCK_LABELS[block.type]}`}
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{BLOCK_LABELS[block.type]}</Badge>
        </div>
        <Input
          placeholder="Title"
          value={block.props.title ?? ''}
          onChange={(e) => onUpdate(block.id, { title: e.target.value })}
          className="text-sm h-8"
          aria-label={`${BLOCK_LABELS[block.type]} title`}
        />
        {(block.type === 'hero' || block.type === 'cta') && (
          <Input
            placeholder="Button label"
            value={block.props.buttonLabel ?? ''}
            onChange={(e) => onUpdate(block.id, { buttonLabel: e.target.value })}
            className="text-sm h-8"
            aria-label={`${BLOCK_LABELS[block.type]} button label`}
          />
        )}
      </div>
      <button
        onClick={() => onRemove(block.id)}
        className="mt-1 text-gray-400 hover:text-red-500"
        aria-label={`Remove ${BLOCK_LABELS[block.type]}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

interface PortalBlockEditorProps {
  value: PortalConfig;
  onChange: (config: PortalConfig) => void;
}

export function PortalBlockEditor({ value, onChange }: PortalBlockEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIdx = value.blocks.findIndex((b) => b.id === active.id);
        const newIdx = value.blocks.findIndex((b) => b.id === over.id);
        onChange({ blocks: arrayMove(value.blocks, oldIdx, newIdx) });
      }
    },
    [value.blocks, onChange]
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      onChange({
        blocks: [
          ...value.blocks,
          { id: generateId(), type, props: {} },
        ],
      });
    },
    [value.blocks, onChange]
  );

  const updateBlock = useCallback(
    (id: string, props: Partial<PortalBlock['props']>) => {
      onChange({
        blocks: value.blocks.map((b) =>
          b.id === id ? { ...b, props: { ...b.props, ...props } } : b
        ),
      });
    },
    [value.blocks, onChange]
  );

  const removeBlock = useCallback(
    (id: string) => {
      onChange({ blocks: value.blocks.filter((b) => b.id !== id) });
    },
    [value.blocks, onChange]
  );

  const blockTypes: BlockType[] = [
    'hero',
    'courses',
    'features',
    'cta',
    'testimonials',
  ];

  return (
    <div className="space-y-4" aria-label="Portal block editor">
      <div className="flex flex-wrap gap-2" aria-label="Add blocks">
        {blockTypes.map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => addBlock(type)}
            aria-label={`Add ${BLOCK_LABELS[type]} block`}
          >
            <Plus size={14} className="mr-1" />
            {BLOCK_LABELS[type]}
          </Button>
        ))}
      </div>

      {value.blocks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Add blocks from the palette above to build your portal.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {value.blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onRemove={removeBlock}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
