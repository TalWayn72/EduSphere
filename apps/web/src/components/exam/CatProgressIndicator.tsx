/**
 * CatProgressIndicator — Adaptive progress display for CAT exams.
 *
 * Shows a range bar (min..current..max) since CAT length is variable.
 * Does NOT show exact questions remaining — that depends on ability convergence.
 */
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CatProgressIndicatorProps {
  currentItemNumber: number;
  minItems: number;
  maxItems: number;
  className?: string;
}

export function CatProgressIndicator({
  currentItemNumber,
  minItems,
  maxItems,
  className,
}: CatProgressIndicatorProps) {
  const range = maxItems - minItems;
  const effectiveMax = range > 0 ? maxItems : minItems;
  const percent =
    effectiveMax > 0
      ? Math.min(100, Math.round((currentItemNumber / effectiveMax) * 100))
      : 0;

  const minPercent =
    effectiveMax > 0 ? Math.round((minItems / effectiveMax) * 100) : 50;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Estimating your ability level</span>
        <span>
          Question {currentItemNumber} of {minItems}–{maxItems}
        </span>
      </div>

      <div className="relative">
        <Progress value={percent} className="h-3" />

        {/* Min-items marker */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-amber-500 dark:bg-amber-600"
          style={{ left: `${minPercent}%` }}
          title={`Minimum: ${minItems} items`}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Min: {minItems}</span>
        <span>Max: {maxItems}</span>
      </div>
    </div>
  );
}
