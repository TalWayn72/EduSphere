import type { MultipleChoice } from '@/types/quiz';

interface Props {
  item: MultipleChoice;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestion({ item, value, onChange, disabled }: Props) {
  const isMulti = item.correctOptionIds.length > 1;

  const toggle = (id: string) => {
    if (disabled) return;
    if (isMulti) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    } else {
      onChange([id]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">{item.question}</p>
      {item.options.map((opt) => {
        const selected = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.id)}
            aria-pressed={selected}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors
              ${selected
                ? 'border-primary bg-primary/10 font-medium'
                : 'border-border hover:border-primary/50 hover:bg-muted/40'}
              ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex-shrink-0 h-4 w-4 rounded-${isMulti ? 'sm' : 'full'} border
                  ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}
              />
              {opt.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}
