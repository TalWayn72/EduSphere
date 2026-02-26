import type { FillBlank } from '@/types/quiz';

interface Props {
  item: FillBlank;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function parseQuestion(
  question: string
): Array<{ type: 'text' | 'blank'; content: string }> {
  const parts = question.split('{{blank}}');
  return parts.flatMap((text, idx) => {
    const segment: Array<{ type: 'text' | 'blank'; content: string }> = [
      { type: 'text', content: text },
    ];
    if (idx < parts.length - 1) {
      segment.push({ type: 'blank', content: '' });
    }
    return segment;
  });
}

export function FillBlankQuestion({ item, value, onChange, disabled }: Props) {
  const segments = parseQuestion(item.question);
  const hasBlank = segments.some((s) => s.type === 'blank');

  return (
    <div className="space-y-3">
      {hasBlank ? (
        <p className="font-medium text-sm leading-relaxed flex flex-wrap items-center gap-1">
          {segments.map((seg, idx) =>
            seg.type === 'text' ? (
              <span key={idx}>{seg.content}</span>
            ) : (
              <input
                key={idx}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder="your answer"
                aria-label="Fill in the blank"
                className="inline-block min-w-[8rem] border-b-2 border-primary bg-transparent px-1 text-sm focus:outline-none focus:border-primary/80 disabled:opacity-70"
              />
            )
          )}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="font-medium text-sm">{item.question}</p>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer here"
            aria-label="Your answer"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-70"
          />
        </div>
      )}
      {item.useSemanticMatching && (
        <p className="text-xs text-muted-foreground">
          Answers are evaluated using semantic similarity matching.
        </p>
      )}
    </div>
  );
}
