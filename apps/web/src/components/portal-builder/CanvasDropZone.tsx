/**
 * CanvasDropZone — droppable canvas for the portal builder.
 * Accepts dropped block types from BlockPalette, renders existing blocks
 * in sortable order with remove and drag-to-reorder support.
 */
import { useRef } from 'react';
import { GripVertical, X } from 'lucide-react';
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
  const isDraggingPalette = useRef<boolean>(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paletteType = e.dataTransfer.getData('blockType') as BlockType | '';
    if (paletteType) {
      onDrop(paletteType);
      isDraggingPalette.current = false;
      return;
    }
    // Reorder drop on canvas (no target index = append, handled via block-level drop)
  };

  const handleBlockDragStart = (idx: number) => {
    dragIdx.current = idx;
    isDraggingPalette.current = false;
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
      role="region"
      aria-label="Portal canvas"
    >
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          draggable
          onDragStart={() => handleBlockDragStart(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleBlockDrop(e, idx)}
          className="relative group border rounded-xl bg-background overflow-hidden
            cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
          aria-label={`${block.type} block`}
        >
          <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </div>
          <button
            onClick={() => onRemove(block.id)}
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100
              transition-opacity p-1 rounded-md bg-destructive/80 text-destructive-foreground
              hover:bg-destructive"
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
