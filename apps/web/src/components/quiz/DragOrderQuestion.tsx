import { useRef } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  /** Keyboard reorder: move item at `idx` up or down by one position */
  const handleMove = (idx: number, direction: 'up' | 'down') => {
    if (disabled) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= orderedItems.length) return;
    const next = [...orderedItems];
    const [moved] = next.splice(idx, 1);
    if (!moved) return;
    next.splice(targetIdx, 0, moved);
    onChange(next.map((it) => it.id));
  };

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">{item.question}</p>
      <p className="text-xs text-muted-foreground">
        Drag items into the correct order
      </p>
      {/* WCAG 2.5.7 — screen-reader instruction for keyboard users */}
      <span className="sr-only">
        Keyboard users: use the up and down buttons to reorder items
      </span>
      <ul role="list" aria-label="Orderable items" className="space-y-2">
        {orderedItems.map((it, idx) => (
          <li
            key={it.id}
            role="listitem"
            draggable={!disabled}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border bg-card text-sm
              ${disabled ? 'cursor-default opacity-70' : 'cursor-grab active:cursor-grabbing hover:border-primary/50'}`}
          >
            <GripVertical
              className="h-4 w-4 text-muted-foreground flex-shrink-0"
              aria-hidden
            />
            <span className="flex-shrink-0 text-xs text-muted-foreground w-5 text-center">
              {idx + 1}
            </span>
            <span className="flex-1">{it.text}</span>
            {/* Keyboard-accessible Up/Down controls (WCAG 2.5.7) */}
            <div className="flex flex-col gap-0.5 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={disabled || idx === 0}
                aria-label={`Move ${it.text} up`}
                onClick={() => handleMove(idx, 'up')}
                tabIndex={0}
              >
                <ChevronUp className="h-3 w-3" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={disabled || idx === orderedItems.length - 1}
                aria-label={`Move ${it.text} down`}
                onClick={() => handleMove(idx, 'down')}
                tabIndex={0}
              >
                <ChevronDown className="h-3 w-3" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
