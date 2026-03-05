import { cn } from '@/lib/utils';

type MasteryLevel = 'none' | 'attempted' | 'familiar' | 'proficient' | 'mastered';

const MASTERY_LABELS: Record<MasteryLevel, string> = {
  none: 'Not Started',
  attempted: 'Attempted',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

interface MasteryBadgeProps {
  level: MasteryLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function MasteryBadge({ level, showLabel = true, size = 'md', className }: MasteryBadgeProps) {
  return (
    <span
      className={cn(
        `mastery-${level}`,
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className
      )}
      data-testid={`mastery-badge-${level}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {showLabel && MASTERY_LABELS[level]}
    </span>
  );
}
