import { cn } from '@/lib/utils';
import { ProgressStatus } from '@/components/ProgressStatus';

type SpinnerSize = 'sm' | 'md' | 'lg';

const SPINNER_SIZE: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

interface LoadingSpinnerProps {
  /** Visual size of the spinner circle. */
  size?: SpinnerSize;
  /** Height of the centering container (Tailwind class, e.g. "h-64", "h-screen"). */
  containerHeight?: string;
  /** Additional className for the outer wrapper. */
  className?: string;
  /** Accessible label for the spinner. */
  label?: string;
  /** Optional progress messages — when provided, shows cycling status text below spinner */
  messages?: readonly string[];
  /** i18n namespace for messages */
  messagesNamespace?: string;
}

/**
 * Shared loading spinner used across pages for consistency.
 * Replaces duplicate inline `<div className="animate-spin rounded-full ..."/>` patterns.
 */
export function LoadingSpinner({
  size = 'md',
  containerHeight = 'h-64',
  className,
  label = 'Loading',
  messages,
  messagesNamespace,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        containerHeight,
        className,
      )}
      aria-label={label}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary',
          SPINNER_SIZE[size],
        )}
      />
      {messages && messages.length > 0 && (
        <ProgressStatus
          messages={messages}
          active
          variant="minimal"
          namespace={messagesNamespace}
        />
      )}
    </div>
  );
}
