/**
 * CatQuestionCard — Renders a single CAT question with selectable options.
 */

interface CatQuestionCardProps {
  stem: string;
  options: Array<{ id: string; text: string }>;
  selectedAnswer: string | null;
  onSelect: (optionId: string) => void;
}

export function CatQuestionCard({
  stem,
  options,
  selectedAnswer,
  onSelect,
}: CatQuestionCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">{stem}</h2>

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`w-full rounded-md border p-3 text-left transition-colors ${
              selectedAnswer === opt.id
                ? 'border-primary bg-primary/10'
                : 'hover:bg-muted'
            }`}
            onClick={() => onSelect(opt.id)}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
