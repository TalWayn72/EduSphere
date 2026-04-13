/**
 * ViewerCount — pulsing red dot + viewer count badge.
 * compact prop: renders just the number with dot (for overlays).
 */
import { cn } from '@/lib/utils';

interface ViewerCountProps {
  count: number;
  compact?: boolean;
  className?: string;
}

export function ViewerCount({ count, compact = false, className }: ViewerCountProps) {
  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs font-semibold text-white dark:text-white',
          className
        )}
        aria-label={`${count} viewers`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-pulse" aria-hidden="true" />
        {count}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        'bg-black/60 text-white backdrop-blur-sm',
        className
      )}
      aria-label={`${count} viewers watching`}
    >
      <span className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 animate-pulse" aria-hidden="true" />
      <span dir="auto">{count} צופים</span>
    </span>
  );
}
