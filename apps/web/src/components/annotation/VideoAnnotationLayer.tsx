/**
 * VideoAnnotationLayer — overlays annotation markers on a video timeline bar.
 *
 * - Proportionally positions colored markers per annotation timestamp.
 * - Floating "Add Note" button captures current playhead and opens AddAnnotationForm.
 * - Delegates timeline rendering and seek to AnnotationTimeline.
 * - Memory-safe: subscription pause is handled inside useVideoAnnotations.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVideoAnnotations, type VideoAnnotation } from '@/hooks/useVideoAnnotations';
import { AnnotationTimeline } from './AnnotationTimeline';
import { AddAnnotationForm } from './AddAnnotationForm';

// ── Types ────────────────────────────────────────────────────────────────────

interface VideoAnnotationLayerProps {
  videoId: string;
  tenantId: string;
  currentTime: number;
  duration: number;
  onAnnotationClick: (annotation: VideoAnnotation) => void;
  onSeek?: (timestamp: number) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VideoAnnotationLayer({
  videoId,
  tenantId,
  currentTime,
  duration,
  onAnnotationClick,
  onSeek,
}: VideoAnnotationLayerProps) {
  const [showForm, setShowForm] = useState(false);
  const { annotations, isLoading, addAnnotation } = useVideoAnnotations(videoId, tenantId);

  const handleSave = async (text: string, timestamp: number) => {
    await addAnnotation(text, timestamp);
    setShowForm(false);
  };

  if (duration <= 0) return null;

  return (
    <div className="relative w-full" aria-label="Video annotation layer">
      {/* Timeline with seek support */}
      <AnnotationTimeline
        annotations={annotations}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek ?? (() => undefined)}
      />

      {/* Annotation dot markers (tooltip-equipped, keyboard accessible) */}
      <div
        className="relative h-6 mt-1"
        role="list"
        aria-label="Annotation markers"
      >
        {annotations.map((ann) => {
          const leftPct = Math.min((ann.timestamp / duration) * 100, 99);
          return (
            <Tooltip key={ann.id}>
              <TooltipTrigger asChild>
                <button
                  role="listitem"
                  className="absolute top-0 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-white shadow
                             cursor-pointer hover:scale-125 transition-transform
                             focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ left: `${leftPct}%`, backgroundColor: ann.color }}
                  aria-label={`Annotation at ${Math.floor(ann.timestamp)}s: ${ann.text.slice(0, 60)}`}
                  onClick={() => onAnnotationClick(ann)}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="max-w-xs text-xs">{ann.text.slice(0, 100)}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
          Loading annotations…
        </p>
      )}

      {/* Add annotation trigger / form */}
      <div className="relative mt-1">
        {showForm ? (
          <AddAnnotationForm
            currentTime={currentTime}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowForm(true)}
            aria-label="Add annotation at current time"
          >
            + Add Note
          </Button>
        )}
      </div>
    </div>
  );
}
