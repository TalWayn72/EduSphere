/**
 * PolishingProgressOverlay — real-time progress panel during AI polishing.
 *
 * Uses a GraphQL subscription (POLISHING_PROGRESS_SUBSCRIPTION) to stream
 * live progress updates. Renders a progress bar and status message.
 * Calls onComplete when the subscription reports status !== 'PROCESSING'.
 */
import { useEffect } from 'react';
import { useSubscription } from 'urql';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { POLISHING_PROGRESS_SUBSCRIPTION } from '@/lib/graphql/polished-transcript.queries';

interface PolishingProgressData {
  polishingProgress: {
    lessonId: string;
    progress: number;
    status: string;
  };
}

interface PolishingProgressOverlayProps {
  lessonId: string;
  onComplete?: () => void;
  className?: string;
}

export function PolishingProgressOverlay({
  lessonId,
  onComplete,
  className = '',
}: PolishingProgressOverlayProps) {
  const { t } = useTranslation('content');

  const [{ data }] = useSubscription<PolishingProgressData>({
    query: POLISHING_PROGRESS_SUBSCRIPTION,
    variables: { lessonId },
  });

  const progress = data?.polishingProgress?.progress ?? 0;
  const status = data?.polishingProgress?.status ?? 'PROCESSING';

  useEffect(() => {
    if (status !== 'PROCESSING' && onComplete) {
      onComplete();
    }
  }, [status, onComplete]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 px-6 ${className}`}
      data-testid="polishing-progress-overlay"
      aria-live="polite"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-foreground">
        {t('polishedTranscript.processing', { progress })}
      </p>
      <div className="w-full max-w-xs space-y-1">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-xs text-muted-foreground">{progress}%</p>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {t('polishedTranscript.processingHint')}
      </p>
    </div>
  );
}
