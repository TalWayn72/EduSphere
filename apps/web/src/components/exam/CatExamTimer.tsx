/**
 * CatExamTimer — Countdown timer for CAT exams.
 *
 * UX-only timer; server is authoritative.
 * Memory safety: interval stored in ref, cleared on unmount.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatExamTimerProps {
  totalSeconds: number;
  onExpired: () => void;
  className?: string;
}

export function CatExamTimer({
  totalSeconds,
  onExpired,
  className,
}: CatExamTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);

  const handleExpired = useCallback(() => {
    if (!expiredRef.current) {
      expiredRef.current = true;
      onExpired();
    }
  }, [onExpired]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          handleExpired();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleExpired]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining <= 300; // 5 minutes warning

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-mono',
        isLow
          ? 'bg-destructive/10 text-destructive animate-pulse'
          : 'bg-muted text-muted-foreground',
        className
      )}
      role="timer"
      aria-label={`${minutes} minutes ${seconds} seconds remaining`}
    >
      <Clock className="h-4 w-4" />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
