/**
 * NodePalette — draggable palette of node types for the agent studio.
 */
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { NodeType } from './agent-studio.types';
import { NODE_META } from './agent-studio.types';

function PaletteItem({ type, onAdd }: { type: NodeType; onAdd: (t: NodeType) => void }) {
  const meta = NODE_META[type];
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
      onClick={() => onAdd(type)}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-lg border cursor-grab select-none text-center',
        'focus-visible:ring-2 focus-visible:ring-primary',
        meta.bg,
        meta.color
      )}
      data-testid={`palette-${type.toLowerCase()}`}
      aria-label={`Add ${meta.label} node`}
    >
      {meta.icon}
      <span className="text-[10px] font-semibold">{meta.label}</span>
    </button>
  );
}

interface NodePaletteProps {
  onAdd: (type: NodeType) => void;
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  return (
    <Card className="w-24 flex-shrink-0 p-2 overflow-y-auto" data-testid="node-palette">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">
        Nodes
      </p>
      <div className="flex flex-col gap-2">
        {(Object.keys(NODE_META) as NodeType[]).map((type) => (
          <PaletteItem key={type} type={type} onAdd={onAdd} />
        ))}
      </div>
    </Card>
  );
}
