import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProgressStatus } from '@/hooks/useProgressStatus';

type ProgressVariant = 'inline' | 'block' | 'minimal';

interface ProgressStatusProps {
  /** i18n keys to cycle through */
  messages: readonly string[];
  /** Whether to show and cycle */
  active: boolean;
  /** Display variant (default: 'inline') */
  variant?: ProgressVariant;
  /** Cycle speed in ms (default: 2500) */
  interval?: number;
  /** i18n namespace (default: 'common') */
  namespace?: string;
  /** For phase-driven operations — jump to this index */
  phaseIndex?: number;
  /** Show spinner icon (default: true for inline/block, false for minimal) */
  showSpinner?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Dynamic progress status indicator with cycling i18n messages.
 * Three variants: inline (row), block (centered column), minimal (text only).
 * Accessible: uses role="status" and aria-live="polite".
 */
export function ProgressStatus({
  messages,
  active,
  variant = 'inline',
  interval = 2500,
  namespace = 'common',
  phaseIndex,
  showSpinner,
  className,
}: ProgressStatusProps) {
  const { currentMessage, currentIndex } = useProgressStatus({
    messages,
    interval,
    active,
    namespace,
    phaseIndex,
  });

  // Fade effect: toggle opacity when message changes
  const [visible, setVisible] = useState(true);
  const prevIndexRef = useRef(currentIndex);

  useEffect(() => {
    if (currentIndex !== prevIndexRef.current) {
      setVisible(false);
      const timer = setTimeout(() => {
        setVisible(true);
        prevIndexRef.current = currentIndex;
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  if (!active || messages.length === 0) return null;

  const resolvedShowSpinner = showSpinner ?? variant !== 'minimal';

  const spinnerElement = resolvedShowSpinner ? (
    <Loader2
      className={cn(
        'motion-safe:animate-spin shrink-0',
        variant === 'block' ? 'h-8 w-8' : 'h-4 w-4',
      )}
      aria-hidden="true"
    />
  ) : null;

  const textElement = (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'motion-safe:transition-opacity motion-safe:duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {currentMessage}
    </span>
  );

  if (variant === 'block') {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-3 text-muted-foreground',
          className,
        )}
      >
        {spinnerElement}
        {textElement}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        {textElement}
      </span>
    );
  }

  // Default: inline — use <span> (not <div>) so it works inside <button>
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm',
        className,
      )}
    >
      {spinnerElement}
      {textElement}
    </span>
  );
}
