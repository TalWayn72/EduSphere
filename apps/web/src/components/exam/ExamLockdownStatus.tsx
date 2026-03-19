/**
 * ExamLockdownStatus — Small indicator showing secure exam mode status.
 *
 * Green: all checks passing. Yellow: violation(s) recorded.
 */
import { Lock, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExamLockdownStatusProps {
  active: boolean;
  violationCount: number;
  className?: string;
}

export function ExamLockdownStatus({
  active,
  violationCount,
  className,
}: ExamLockdownStatusProps) {
  if (!active) return null;

  const hasViolations = violationCount > 0;
  const Icon = hasViolations ? ShieldAlert : Lock;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        hasViolations
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        className,
      )}
      role="status"
      aria-label={
        hasViolations
          ? `Secure mode active — ${violationCount} violation(s)`
          : 'Secure mode active'
      }
    >
      <Icon className="h-3.5 w-3.5" />
      <span>Secure Mode Active</span>
    </div>
  );
}
