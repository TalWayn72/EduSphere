import type { Bookmark } from '@/lib/mock-content-data';
import type { SubtitleTrack } from '../VideoSubtitleSelector';

export type { SubtitleTrack };

export interface VideoPlayerCoreProps {
  /** Direct URL for the original video file (fallback when HLS unavailable). */
  src: string;
  /** HLS master manifest URL (.m3u8). Preferred over src when present. */
  hlsSrc?: string | null;
  /** Bookmark markers to display on the seek bar. */
  bookmarks?: Bookmark[];
  /**
   * Controlled seek target in seconds.
   * Change this value to seek the player externally (e.g. transcript click).
   * Uses the numeric value as trigger — same value twice has no effect.
   */
  seekTo?: number;
  /** Called on every timeupdate event; use to sync transcript panel. */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called once when video metadata is loaded (total duration). */
  onDurationChange?: (duration: number) => void;
  /** Available subtitle tracks (populated after AI translation completes). */
  subtitleTracks?: SubtitleTrack[];
}

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
