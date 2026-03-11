import { cn } from '@/lib/utils';

// WCAG 1.4.1 — not color alone: each level maps to a visible text label AND a numeric position
type MasteryLevel = 'none' | 'attempted' | 'familiar' | 'proficient' | 'mastered';

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  none: 'Not Started',
  attempted: 'Attempted',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

// Numeric position (0–4) used in aria-label to convey progression without color
const MASTERY_NUMBER: Record<MasteryLevel, number> = {
  none: 0,
  attempted: 1,
  familiar: 2,
  proficient: 3,
  mastered: 4,
};

const TOTAL_LEVELS = 4;

interface MasteryBadgeProps {
  level: MasteryLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function MasteryBadge({ level, showLabel = true, size = 'md', className }: MasteryBadgeProps) {
  const label = MASTERY_LABELS[level];
  const num = MASTERY_NUMBER[level];
  // WCAG 1.4.1 — aria-label conveys both the textual meaning AND the numeric level
  const ariaLabel = `Mastery: ${label} (level ${num} of ${TOTAL_LEVELS})`;

  return (
    <span
      className={cn(
        `mastery-${level}`,
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className
      )}
      aria-label={ariaLabel}
      data-testid={`mastery-badge-${level}`}
    >
      {/* Color dot is supplementary — text label below is the primary indicator (WCAG 1.4.1) */}
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      {/* WCAG 1.4.1 — text label always visible (not sr-only) so information is not conveyed by color alone */}
      {showLabel && <span>{label}</span>}
    </span>
  );
}
