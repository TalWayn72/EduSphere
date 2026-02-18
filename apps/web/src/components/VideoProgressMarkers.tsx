/**
 * VideoProgressMarkers — colored dots on the video seek bar at annotation timestamps.
 * Each dot is positioned as left: (timestamp/duration)*100%
 * Clicking a dot fires onSeek(timestamp).
 */
import type { Annotation, AnnotationLayer } from '@/types/annotations';
import { LAYER_META } from '@/pages/content-viewer.utils';
import { formatTime } from '@/pages/content-viewer.utils';

/** Map each layer to a dot color (Tailwind background) */
const LAYER_DOT_COLOR: Record<string, string> = {
  PERSONAL: '#7c3aed',      // violet-600
  SHARED: '#2563eb',        // blue-600
  INSTRUCTOR: '#16a34a',    // green-600
  AI_GENERATED: '#d97706',  // amber-600
};

export interface VideoMarker {
  timestamp: number;
  color: string;
  label: string;
  layer: AnnotationLayer;
}

interface VideoProgressMarkersProps {
  /** Flat list of annotations that have a contentTimestamp */
  annotations: Annotation[];
  /** Total video duration in seconds */
  duration: number;
  /** Callback when a marker dot is clicked */
  onSeek: (timestamp: number) => void;
}

/** Converts an Annotation array into VideoMarker objects */
export function annotationsToMarkers(annotations: Annotation[]): VideoMarker[] {
  return annotations
    .filter((a) => a.contentTimestamp !== undefined)
    .map((a) => ({
      timestamp: a.contentTimestamp as number,
      color: LAYER_DOT_COLOR[a.layer] ?? '#6b7280',
      label: `${LAYER_META[a.layer]?.label ?? a.layer} — ${a.userName}: ${a.content.slice(0, 60)}`,
      layer: a.layer,
    }));
}

export function VideoProgressMarkers({
  annotations,
  duration,
  onSeek,
}: VideoProgressMarkersProps) {
  if (duration <= 0) return null;

  const markers = annotationsToMarkers(annotations);

  return (
    <>
      {markers.map((marker, idx) => (
        <div
          key={`${marker.layer}-${marker.timestamp}-${idx}`}
          role="button"
          tabIndex={0}
          aria-label={`Jump to annotation at ${formatTime(marker.timestamp)}: ${marker.label}`}
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full cursor-pointer z-20
                     ring-1 ring-white hover:scale-125 transition-transform"
          style={{
            left: `${(marker.timestamp / duration) * 100}%`,
            backgroundColor: marker.color,
          }}
          title={marker.label}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(marker.timestamp);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSeek(marker.timestamp);
            }
          }}
        />
      ))}
    </>
  );
}
