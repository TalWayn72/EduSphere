/**
 * InstructorControls — control bar for instructor-role users in LiveLessonPage.
 *
 * - Start / Pause / Resume / End stream (state-dependent)
 * - Toggle Screen Share
 * - Highlight Moment button
 * - Pinned message count indicator
 * - End Stream: AlertDialog confirmation
 * - Status badge: PRE_LIVE / LIVE / PAUSED
 * - Destructive actions (End) in red
 */
import { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Monitor,
  Bookmark,
  Pin,
  Loader2,
} from 'lucide-react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  START_LIVE_STREAM_MUTATION,
  PAUSE_LIVE_STREAM_MUTATION,
  END_LIVE_STREAM_MUTATION,
  TOGGLE_SCREEN_SHARE_MUTATION,
  HIGHLIGHT_MOMENT_MUTATION,
} from '@/lib/graphql/live-stream-session.queries';
import type { LiveSessionPhase } from '@/types/live-session.types';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface InstructorControlsProps {
  sessionId: string;
  phase: LiveSessionPhase;
  isScreenSharing: boolean;
  pinnedMessageCount?: number;
  onPhaseChange?: (phase: LiveSessionPhase) => void;
  className?: string;
}

// ── Phase badge map ────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const PHASE_BADGE: Record<
  LiveSessionPhase,
  { label: string; variant: BadgeVariant }
> = {
  PRE_LIVE: { label: 'PRE-LIVE', variant: 'outline' },
  LIVE: { label: 'LIVE', variant: 'destructive' },
  PAUSED: { label: 'PAUSED', variant: 'secondary' },
  ENDED: { label: 'ENDED', variant: 'secondary' },
  VOD_READY: { label: 'VOD', variant: 'secondary' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function InstructorControls({
  sessionId,
  phase,
  isScreenSharing,
  pinnedMessageCount = 0,
  onPhaseChange,
  className,
}: InstructorControlsProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const [, executeStart] = useMutation(START_LIVE_STREAM_MUTATION);
  const [, executePause] = useMutation(PAUSE_LIVE_STREAM_MUTATION);
  const [, executeEnd] = useMutation(END_LIVE_STREAM_MUTATION);
  const [, executeScreen] = useMutation(TOGGLE_SCREEN_SHARE_MUTATION);
  const [, executeHighlight] = useMutation(HIGHLIGHT_MOMENT_MUTATION);

  const run = async (
    key: string,
    fn: () => Promise<unknown>,
    newPhase?: LiveSessionPhase
  ) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
      if (newPhase) onPhaseChange?.(newPhase);
    } finally {
      setBusy(null);
    }
  };

  const handleStart = () =>
    run('start', () => executeStart({ sessionId }), 'LIVE');
  const handlePause = () =>
    run('pause', () => executePause({ sessionId }), 'PAUSED');
  const handleResume = () =>
    run('resume', () => executeStart({ sessionId }), 'LIVE');
  const handleEnd = () => run('end', () => executeEnd({ sessionId }), 'ENDED');
  const handleScreen = () =>
    run('screen', () => executeScreen({ sessionId, active: !isScreenSharing }));
  const handleHighlight = () => {
    const label = `רגע מודגש ${new Date().toLocaleTimeString('he-IL')}`;
    const streamTs = Date.now() / 1000;
    void run('highlight', () =>
      executeHighlight({ sessionId, streamTs, label })
    );
  };

  const badgeInfo = PHASE_BADGE[phase];
  const isLive = phase === 'LIVE';
  const isPaused = phase === 'PAUSED';
  const isScheduled = phase === 'PRE_LIVE';
  const isEnded = phase === 'ENDED' || phase === 'VOD_READY';

  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap px-3 py-2 border-b bg-muted/30',
        className
      )}
      data-testid="instructor-controls"
      role="toolbar"
      aria-label="Instructor stream controls"
    >
      {/* Phase badge */}
      <Badge variant={badgeInfo.variant} className="text-xs font-mono shrink-0">
        {isLive && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-white dark:bg-white animate-pulse mr-1"
            aria-hidden="true"
          />
        )}
        {badgeInfo.label}
      </Badge>

      <div className="h-4 w-px bg-border shrink-0" aria-hidden="true" />

      {/* Start — only when SCHEDULED */}
      {isScheduled && (
        <Button
          size="sm"
          variant="default"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            void handleStart();
          }}
          disabled={!!busy}
          data-testid="btn-start-stream"
        >
          {busy === 'start' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          התחל שידור
        </Button>
      )}

      {/* Pause — only when LIVE */}
      {isLive && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            void handlePause();
          }}
          disabled={!!busy}
          data-testid="btn-pause-stream"
        >
          {busy === 'pause' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Pause className="h-3 w-3" />
          )}
          השהה
        </Button>
      )}

      {/* Resume — only when PAUSED */}
      {isPaused && (
        <Button
          size="sm"
          variant="default"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            void handleResume();
          }}
          disabled={!!busy}
          data-testid="btn-resume-stream"
        >
          {busy === 'resume' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          המשך
        </Button>
      )}

      {/* Screen share — only when LIVE or PAUSED */}
      {(isLive || isPaused) && (
        <Button
          size="sm"
          variant={isScreenSharing ? 'secondary' : 'outline'}
          className="h-7 gap-1 text-xs"
          onClick={() => {
            void handleScreen();
          }}
          disabled={!!busy}
          data-testid="btn-screen-share"
        >
          {busy === 'screen' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Monitor className="h-3 w-3" />
          )}
          {isScreenSharing ? 'עצור שיתוף' : 'שתף מסך'}
        </Button>
      )}

      {/* Highlight moment — only when LIVE */}
      {isLive && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={handleHighlight}
          disabled={!!busy}
          data-testid="btn-highlight"
        >
          {busy === 'highlight' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Bookmark className="h-3 w-3" />
          )}
          רגע מודגש
        </Button>
      )}

      {/* Pinned count */}
      {pinnedMessageCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Pin className="h-3 w-3" aria-hidden="true" />
          <span>{pinnedMessageCount}</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* End stream — with confirmation dialog */}
      {!isEnded && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 gap-1 text-xs"
              disabled={!!busy}
              data-testid="btn-end-stream"
            >
              <Square className="h-3 w-3" />
              סיים שידור
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle dir="auto">לסיים את השידור?</AlertDialogTitle>
              <AlertDialogDescription dir="auto">
                פעולה זו תסיים את השידור החי. לא ניתן יהיה להמשיך אחר כך.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel dir="auto">ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void handleEnd();
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                כן, סיים
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
