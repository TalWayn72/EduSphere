import type { Likert } from '@/types/quiz';

interface Props {
  item: Likert;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function LikertQuestion({ item, value, onChange, disabled }: Props) {
  const points = Array.from({ length: item.scale }, (_, i) => i + 1);
  const minLabel = item.labels?.min ?? 'Strongly Disagree';
  const maxLabel = item.labels?.max ?? 'Strongly Agree';

  return (
    <div className="space-y-4">
      <p className="font-medium text-sm">{item.question}</p>
      <div
        className="flex items-start gap-2"
        role="radiogroup"
        aria-label={item.question}
      >
        <span className="text-xs text-muted-foreground w-28 text-right pt-3 flex-shrink-0">
          {minLabel}
        </span>
        <div className="flex-1 flex justify-around">
          {points.map((pt) => (
            <label
              key={pt}
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <input
                type="radio"
                name={`likert-${item.question}`}
                value={pt}
                checked={value === pt}
                disabled={disabled}
                onChange={() => onChange(pt)}
                className="h-4 w-4 cursor-pointer accent-primary"
                aria-label={String(pt)}
              />
              <span className="text-xs text-muted-foreground">{pt}</span>
            </label>
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-28 pt-3 flex-shrink-0">
          {maxLabel}
        </span>
      </div>
    </div>
  );
}
