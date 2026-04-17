/**
 * PolishingProgressOverlay — real-time progress panel during AI polishing.
 *
 * Primary: GraphQL subscription (POLISHING_PROGRESS_SUBSCRIPTION) for live updates.
 * Fallback: HTTP polling via POLISHED_TRANSCRIPT_STATUS_QUERY every 2 s when
 *           WebSocket is unavailable or delivers no data yet.
 *
 * On mount it immediately queries current status — if already COMPLETED or FAILED
 * it calls onComplete / onError without ever showing the spinner.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useSubscription } from 'urql';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import {
  POLISHING_PROGRESS_SUBSCRIPTION,
  POLISHED_TRANSCRIPT_STATUS_QUERY,
} from '@/lib/graphql/polished-transcript.queries';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PolishingProgressData {
  polishingProgress: {
    lessonId: string;
    progress: number;
    status: string;
  };
}

interface PolishedTranscriptStatusData {
  polishedTranscript: {
    id: string;
    status: string;
  } | null;
}

export interface PolishingProgressOverlayProps {
  lessonId: string;
  onComplete?: () => void;
  onError?: () => void;
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'APPROVED', 'PUBLISHED']);

// ── Component ─────────────────────────────────────────────────────────────────

export function PolishingProgressOverlay({
  lessonId,
  onComplete,
  onError,
  className = '',
}: PolishingProgressOverlayProps) {
  const { t } = useTranslation('content');

  // Track whether we've already called the terminal callback so we don't double-fire.
  const calledTerminal = useRef(false);

  // Controls whether the polling query is active (paused once terminal reached).
  const [pollPaused, setPollPaused] = useState(false);

  // ── Subscription (primary) ─────────────────────────────────────────────────
  const [{ data: subData }] = useSubscription<PolishingProgressData>({
    query: POLISHING_PROGRESS_SUBSCRIPTION,
    variables: { lessonId },
  });

  // ── Polling query (fallback + initial status check) ────────────────────────
  const [{ data: pollData }] = useQuery<PolishedTranscriptStatusData>({
    query: POLISHED_TRANSCRIPT_STATUS_QUERY,
    variables: { lessonId },
    requestPolicy: 'network-only',
    context: {
      // urql poll: re-execute every POLL_INTERVAL_MS while not paused.
      pollInterval: pollPaused ? 0 : POLL_INTERVAL_MS,
    },
    pause: pollPaused,
  });

  // ── Derive effective status/progress ──────────────────────────────────────
  // Prefer subscription data (real-time); fall back to poll data.
  const subStatus = subData?.polishingProgress?.status;
  const subProgress = subData?.polishingProgress?.progress;
  const pollStatus = pollData?.polishedTranscript?.status;

  const effectiveStatus = subStatus ?? pollStatus ?? 'PROCESSING';
  const progress = subProgress ?? 0;

  // ── Terminal state handler ─────────────────────────────────────────────────
  useEffect(() => {
    if (!TERMINAL_STATUSES.has(effectiveStatus)) return;
    if (calledTerminal.current) return;

    calledTerminal.current = true;
    setPollPaused(true);

    if (effectiveStatus === 'FAILED') {
      onError?.();
    } else {
      onComplete?.();
    }
  }, [effectiveStatus, onComplete, onError]);

  // If status is already terminal on first render, the effect above will fire
  // immediately — nothing else to render in that tick.
  if (TERMINAL_STATUSES.has(effectiveStatus) && calledTerminal.current) {
    return null;
  }

  // ── Render spinner ─────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 px-6 ${className}`}
      data-testid="polishing-progress-overlay"
      aria-live="polite"
      dir="rtl"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-foreground text-right">
        {t('polishedTranscript.processing', { progress })}
      </p>
      <div className="w-full max-w-xs space-y-1">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-xs text-muted-foreground">{progress}%</p>
      </div>
      <p className="text-xs text-muted-foreground text-center" dir="rtl">
        {t('polishedTranscript.processingHint')}
      </p>
    </div>
  );
}
