/**
 * PolishingStatusBadge — displays the current polishing pipeline status.
 *
 * Shows a coloured badge for DRAFT / APPROVED / PUBLISHED states,
 * and an animated progress indicator for PROCESSING.
 */
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { PolishingStatus } from './polished-transcript.types';

interface PolishingStatusBadgeProps {
  status: PolishingStatus;
  /** 0-100; only rendered when status === 'PROCESSING' */
  progress?: number | null;
  className?: string;
}

const STATUS_VARIANT: Record<
  PolishingStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  PROCESSING: 'secondary',
  DRAFT: 'outline',
  APPROVED: 'default',
  PUBLISHED: 'default',
};

export function PolishingStatusBadge({
  status,
  progress,
  className = '',
}: PolishingStatusBadgeProps) {
  const { t } = useTranslation('content');

  if (status === 'PROCESSING') {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 ${className}`}
        data-testid="polishing-status-badge"
        aria-live="polite"
        aria-label={t('polishedTranscript.processing', {
          progress: progress ?? 0,
        })}
      >
        <span
          className="h-3.5 w-3.5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
        <span>
          {t('polishedTranscript.processing', { progress: progress ?? 0 })}
        </span>
      </div>
    );
  }

  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      className={className}
      data-testid="polishing-status-badge"
    >
      {t(`polishedTranscript.status.${status.toLowerCase()}`)}
    </Badge>
  );
}
