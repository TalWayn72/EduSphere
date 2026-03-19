import type { DomainScore, BloomScore } from '@/types/exam-entities';
import { cn } from '@/lib/utils';

interface DomainChartProps {
  scores: DomainScore[];
  passingPercentage: number;
}

export function DomainScoreChart({ scores, passingPercentage }: DomainChartProps) {
  if (scores.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Domain Scores</h3>
      {scores.map((s) => {
        const percentage = s.total > 0 ? (s.correct / s.total) * 100 : 0;
        const passed = percentage >= passingPercentage;
        return (
          <div key={s.domain} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate max-w-[60%]">{s.domain}</span>
              <span className="text-muted-foreground">
                {s.correct}/{s.total} ({Math.round(percentage)}%)
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  passed ? 'bg-green-500' : 'bg-red-400',
                )}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface BloomChartProps {
  scores: BloomScore[];
}

const BLOOM_COLORS: Record<string, string> = {
  REMEMBER: 'bg-blue-400',
  UNDERSTAND: 'bg-cyan-400',
  APPLY: 'bg-green-400',
  ANALYZE: 'bg-yellow-400',
  EVALUATE: 'bg-orange-400',
  CREATE: 'bg-red-400',
};

export function BloomScoreChart({ scores }: BloomChartProps) {
  if (scores.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Bloom Level Breakdown</h3>
      {scores.map((s) => {
        const percentage = s.total > 0 ? (s.correct / s.total) * 100 : 0;
        return (
          <div key={s.level} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium capitalize">{s.level.toLowerCase()}</span>
              <span className="text-muted-foreground">
                {s.correct}/{s.total} ({Math.round(percentage)}%)
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  BLOOM_COLORS[s.level] ?? 'bg-primary',
                )}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
