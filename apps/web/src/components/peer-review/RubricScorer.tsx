/**
 * RubricScorer — renders per-criterion sliders and a total score summary.
 */
import { useState } from 'react';

export interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  maxScore: number;
}

interface RubricScorerProps {
  criteria: RubricCriterion[];
  onChange: (scores: Record<string, number>) => void;
}

export default function RubricScorer({ criteria, onChange }: RubricScorerProps) {
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, 0]))
  );

  const handleChange = (id: string, value: number) => {
    const next = { ...scores, [id]: value };
    setScores(next);
    onChange(next);
  };

  const total = Object.values(scores).reduce((sum, v) => sum + v, 0);
  const maxTotal = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  return (
    <div className="space-y-5">
      {criteria.map((c) => (
        <div key={c.id} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{c.label}</span>
            <span className="text-sm text-muted-foreground">
              {scores[c.id] ?? 0} / {c.maxScore}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{c.description}</p>
          <input
            type="range"
            min={0}
            max={c.maxScore}
            step={1}
            value={scores[c.id] ?? 0}
            onChange={(e) => handleChange(c.id, Number(e.target.value))}
            className="w-full accent-primary"
            aria-label={`${c.label} score`}
          />
        </div>
      ))}

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm font-semibold">Total Score</span>
        <span className="text-sm font-semibold text-primary">
          {total} / {maxTotal}
        </span>
      </div>
    </div>
  );
}
