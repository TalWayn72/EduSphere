/**
 * BlockPalette — lists draggable block types for the portal builder.
 * Sets dataTransfer 'blockType' so CanvasDropZone can identify palette drags.
 */
import { GripVertical } from 'lucide-react';
import type { BlockType } from './types';

interface PaletteItem {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'HeroBanner',
    label: 'Hero Banner',
    icon: '🎯',
    description: 'Full-width header with CTA',
  },
  {
    type: 'FeaturedCourses',
    label: 'Featured Courses',
    icon: '📚',
    description: 'Showcase selected courses',
  },
  {
    type: 'StatWidget',
    label: 'Stat Widget',
    icon: '📊',
    description: 'Key metrics at a glance',
  },
  {
    type: 'TextBlock',
    label: 'Text Block',
    icon: '📝',
    description: 'Rich text content',
  },
  {
    type: 'ImageBlock',
    label: 'Image Block',
    icon: '🖼️',
    description: 'Display an image',
  },
  {
    type: 'CTAButton',
    label: 'CTA Button',
    icon: '🔗',
    description: 'Call-to-action button',
  },
];

interface Props {
  onDragStart?: (type: BlockType) => void;
}

export function BlockPalette({ onDragStart }: Props) {
  const handleDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(type);
  };

  return (
    <aside className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Block Types
      </h2>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => handleDragStart(e, item.type)}
          className="flex items-start gap-3 p-3 rounded-lg border bg-background cursor-grab
            hover:border-primary/50 hover:shadow-sm active:cursor-grabbing transition-all select-none"
          aria-label={`Drag to add ${item.label}`}
        >
          <GripVertical
            className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0"
            aria-hidden
          />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {item.description}
            </span>
          </div>
        </div>
      ))}
    </aside>
  );
}
