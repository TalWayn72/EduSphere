import { useState } from 'react';
import type { Matching } from '@/types/quiz';

interface Pair { leftId: string; rightId: string }

interface Props {
  item: Matching;
  value: Pair[];
  onChange: (value: Pair[]) => void;
  disabled?: boolean;
}

const PAIR_COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-amber-100 border-amber-400 text-amber-800',
  'bg-rose-100 border-rose-400 text-rose-800',
];

export function MatchingQuestion({ item, value, onChange, disabled }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const getPairColor = (id: string, side: 'left' | 'right'): string => {
    const idx = value.findIndex((p) =>
      side === 'left' ? p.leftId === id : p.rightId === id,
    );
    return idx >= 0 ? (PAIR_COLORS[idx % PAIR_COLORS.length] ?? '') : '';
  };

  const handleLeft = (id: string) => {
    if (disabled) return;
    setSelectedLeft(selectedLeft === id ? null : id);
  };

  const handleRight = (rightId: string) => {
    if (disabled || !selectedLeft) return;
    const existing = value.filter((p) => p.leftId !== selectedLeft && p.rightId !== rightId);
    onChange([...existing, { leftId: selectedLeft, rightId }]);
    setSelectedLeft(null);
  };

  const baseBtn =
    'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors';

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">{item.question}</p>
      <p className="text-xs text-muted-foreground">
        Click a left item then a right item to create a pair
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {item.leftItems.map((left) => {
            const color = getPairColor(left.id, 'left');
            return (
              <button
                key={left.id}
                type="button"
                disabled={disabled}
                onClick={() => handleLeft(left.id)}
                aria-pressed={selectedLeft === left.id}
                className={`${baseBtn} ${color || 'border-border hover:border-primary/50'}
                  ${selectedLeft === left.id ? 'ring-2 ring-primary ring-offset-1' : ''}
                  ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
              >
                {left.text}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {item.rightItems.map((right) => {
            const color = getPairColor(right.id, 'right');
            return (
              <button
                key={right.id}
                type="button"
                disabled={disabled}
                onClick={() => handleRight(right.id)}
                className={`${baseBtn} ${color || 'border-border hover:border-primary/50'}
                  ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
              >
                {right.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
