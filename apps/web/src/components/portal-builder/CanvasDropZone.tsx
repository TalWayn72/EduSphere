/**
 * CanvasDropZone — droppable canvas for the portal builder.
 * Accepts dropped block types from BlockPalette, renders existing blocks
 * in sortable order with remove and drag-to-reorder support.
 *
 * IS-5568 / WCAG 2.5.7: keyboard Up/Down buttons for reordering blocks
 * so users who cannot drag can still reorganise the canvas.
 */
import { useRef } from 'react';
import { ChevronUp, ChevronDown, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PortalBlock, BlockType } from './types';
import { BlockRenderer } from './blocks/BlockRenderer';

interface Props {
  blocks: PortalBlock[];
  onDrop: (type: BlockType) => void;
  onRemove: (blockId: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

export function CanvasDropZone({ blocks, onDrop, onRemove, onReorder }: Props) {
  const dragIdx = useRef<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paletteType = e.dataTransfer.getData('blockType') as BlockType | '';
    if (paletteType) {
      onDrop(paletteType);
      return;
    }
  };

  const handleBlockDragStart = (idx: number) => {
    dragIdx.current = idx;
  };

  const handleBlockDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const paletteType = e.dataTransfer.getData('blockType') as BlockType | '';
    if (paletteType) {
      onDrop(paletteType);
      return;
    }
    if (dragIdx.current !== null && dragIdx.current !== toIdx) {
      onReorder(dragIdx.current, toIdx);
    }
    dragIdx.current = null;
  };

  /** Keyboard reorder: move block at idx up or down by one position */
  const handleMove = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    onReorder(idx, targetIdx);
  };

  if (blocks.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center border-2 border-dashed rounded-xl
          text-muted-foreground bg-muted/20 min-h-64"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="region"
        aria-label="Portal canvas drop zone"
      >
        <p className="text-sm">Drag blocks here to build your portal</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col gap-3 overflow-y-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="list"
      aria-label="Portal canvas"
    >
      {/* WCAG 2.5.7 — screen-reader instruction for keyboard users */}
      <span className="sr-only">
        Keyboard users: use the up and down buttons on each block to reorder
      </span>
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          role="listitem"
          draggable
          onDragStart={() => handleBlockDragStart(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleBlockDrop(e, idx)}
          className="relative group border rounded-xl bg-background overflow-hidden
            cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
          aria-label={`${block.type} block, position ${idx + 1} of ${blocks.length}`}
        >
          <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </div>

          {/* Keyboard-accessible reorder controls (IS-5568 / WCAG 2.5.7) */}
          <div className="absolute top-2 left-8 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={idx === 0}
              aria-label={`Move ${block.type} block up`}
              onClick={() => handleMove(idx, 'up')}
            >
              <ChevronUp className="h-3 w-3" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={idx === blocks.length - 1}
              aria-label={`Move ${block.type} block down`}
              onClick={() => handleMove(idx, 'down')}
            >
              <ChevronDown className="h-3 w-3" aria-hidden />
            </Button>
          </div>

          <button
            onClick={() => onRemove(block.id)}
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100
              focus:opacity-100 transition-opacity p-1 rounded-md bg-destructive/80
              text-destructive-foreground hover:bg-destructive"
            aria-label={`Remove ${block.type} block`}
          >
            <X className="h-3 w-3" />
          </button>
          <div className="pointer-events-none">
            <BlockRenderer block={block} />
          </div>
        </div>
      ))}
    </div>
  );
}
