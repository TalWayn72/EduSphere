/**
 * LiveVideoPlayer — wraps VideoPlayerCore for live streaming mode.
 *
 * - No seek bar (live stream, position is always "now")
 * - LIVE pulsing red badge (top-left)
 * - Viewer count overlay (top-right)
 * - ReactionBar overlay (bottom-center)
 * - ReactionBurst overlay (full-cover, decorative)
 * - HLS src for BROADCAST/INTERACTIVE, video element for EXTERNAL/RECORDED
 */
import { cn } from '@/lib/utils';
import { ViewerCount } from './ViewerCount';
import { ReactionBar } from './ReactionBar';
import { ReactionBurst } from './ReactionBurst';
import { BookmarkButton } from './BookmarkButton';
import type { LiveReactionBurst } from '@/types/live-session.types';

interface LiveVideoPlayerProps {
  streamUrl: string | null;
  viewerCount: number;
  isLive: boolean;
  reactionQueue: LiveReactionBurst[];
  onSendReaction: (emoji: string) => Promise<void>;
  /** Optional: sessionId + currentTimestampMs to show the BookmarkButton */
  sessionId?: string;
  currentTimestampMs?: number;
  className?: string;
}

export function LiveVideoPlayer({
  streamUrl,
  viewerCount,
  isLive,
  reactionQueue,
  onSendReaction,
  sessionId,
  currentTimestampMs = 0,
  className,
}: LiveVideoPlayerProps) {
  return (
    <div
      className={cn(
        'relative bg-black rounded-lg overflow-hidden select-none',
        'aspect-video w-full',
        className
      )}
      data-testid="live-video-player"
    >
      {/* Native video element for HLS live stream */}
      {streamUrl ? (
        <video
          className="w-full h-full object-contain"
          src={streamUrl}
          autoPlay
          playsInline
          muted={false}
          aria-label="Live video stream"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-zinc-400 dark:text-zinc-500 text-sm">Connecting to stream…</p>
        </div>
      )}

      {/* LIVE badge — top-left */}
      {isLive && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 dark:bg-red-700 text-white dark:text-white text-xs font-bold shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-white animate-pulse" aria-hidden="true" />
          LIVE
        </div>
      )}

      {/* Viewer count — top-right */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {sessionId && (
          <BookmarkButton
            sessionId={sessionId}
            currentTimestampMs={currentTimestampMs}
          />
        )}
        <ViewerCount count={viewerCount} />
      </div>

      {/* ReactionBurst — full-cover, decorative */}
      <ReactionBurst queue={reactionQueue} />

      {/* ReactionBar — bottom-center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <ReactionBar onSend={onSendReaction} />
      </div>
    </div>
  );
}
