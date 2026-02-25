import { useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { DragOrder } from '@/types/quiz';

interface Props {
  item: DragOrder;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function DragOrderQuestion({ item, value, onChange, disabled }: Props) {
  const orderedItems = value.length
    ? value.map((id) => item.items.find((it) => it.id === id)!).filter(Boolean)
    : item.items;

  const dragIndex = useRef<number | null>(null);

  const handleDragStart = (idx: number) => {
    if (disabled) return;
    dragIndex.current = idx;
  };

  const handleDrop = (idx: number) => {
    if (disabled || dragIndex.current === null) return;
    const from = dragIndex.current;
    if (from === idx) return;
    const next = [...orderedItems];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(idx, 0, moved);
    dragIndex.current = null;
    onChange(next.map((it) => it.id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">{item.question}</p>
      <p className="text-xs text-muted-foreground">Drag items into the correct order</p>
      <ul className="space-y-2" role="list" aria-label="Orderable items">
        {orderedItems.map((it, idx) => (
          <li
            key={it.id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border bg-card text-sm
              ${disabled ? 'cursor-default opacity-70' : 'cursor-grab active:cursor-grabbing hover:border-primary/50'}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden />
            <span className="flex-shrink-0 text-xs text-muted-foreground w-5 text-center">
              {idx + 1}
            </span>
            {it.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
