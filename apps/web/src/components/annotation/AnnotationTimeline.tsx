/**
 * AnnotationTimeline — horizontal timeline bar for video annotations.
 *
 * - Proportionally positions colored dot markers per annotation timestamp.
 * - Click anywhere on the bar to seek to that position (onSeek callback).
 * - Renders a vertical "current time" indicator that moves with playback.
 * - Color-coded by annotation layer via the marker's color field.
 */
import type { VideoAnnotation } from '@/hooks/useVideoAnnotations';

// ── Types ────────────────────────────────────────────────────────────────────

interface AnnotationTimelineProps {
  annotations: VideoAnnotation[];
  currentTime: number;
  duration: number;
  onSeek: (timestamp: number) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clampPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max((value / max) * 100, 0), 100);
}

// ── Component ────────────────────────────────────────────────────────────────

export function AnnotationTimeline({
  annotations,
  currentTime,
  duration,
  onSeek,
}: AnnotationTimelineProps) {
  if (duration <= 0) return null;

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    const seekTo = Math.max(0, Math.min(ratio * duration, duration));
    onSeek(seekTo);
  };

  const currentTimePct = clampPct(currentTime, duration);

  return (
    <div
      className="relative w-full h-8 flex flex-col justify-center select-none"
      aria-label="Annotation timeline"
    >
      {/* Clickable timeline bar */}
      <div
        role="slider"
        aria-label="Video timeline — click to seek"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        tabIndex={0}
        className="relative w-full h-2 bg-gray-200 rounded-full cursor-pointer"
        onClick={handleBarClick}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
        }}
      >
        {/* Played portion */}
        <div
          className="absolute inset-y-0 left-0 bg-primary/40 rounded-full pointer-events-none"
          style={{ width: `${currentTimePct}%` }}
          aria-hidden="true"
        />

        {/* Current time indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-md pointer-events-none z-10"
          style={{ left: `${currentTimePct}%` }}
          aria-hidden="true"
        />

        {/* Annotation markers */}
        {annotations.map((ann) => {
          const leftPct = clampPct(ann.timestamp, duration);
          return (
            <div
              key={ann.id}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full z-20
                         ring-1 ring-white hover:scale-125 transition-transform cursor-pointer"
              style={{ left: `${leftPct}%`, backgroundColor: ann.color }}
              title={`${formatTime(ann.timestamp)} — ${ann.text.slice(0, 60)}`}
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(ann.timestamp);
              }}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1 pointer-events-none" aria-hidden="true">
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
