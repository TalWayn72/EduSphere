/**
 * WebVTT formatter — public API for WCAG 1.2.2 caption generation.
 *
 * Re-exports core primitives from the HLS vtt-generator so callers outside the
 * HLS module can reference a stable, purpose-named entry point.
 *
 * Spec: https://www.w3.org/TR/webvtt1/
 * WCAG: 1.2.2 Captions (Prerecorded) — Level A
 */

export interface WhisperSegment {
  /** Segment start time in seconds (fractional). */
  start: number;
  /** Segment end time in seconds (fractional). */
  end: number;
  /** Caption text. May contain leading/trailing whitespace — trimmed before output. */
  text: string;
}

/**
 * Formats a time value (seconds) into WebVTT timestamp format: HH:MM:SS.mmm
 *
 * @example
 *   formatTimestamp(3661.5) // "01:01:01.500"
 */
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return (
    [
      String(h).padStart(2, '0'),
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0'),
    ].join(':') +
    '.' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Converts an array of Whisper segments into a valid WebVTT document string.
 *
 * - Empty / whitespace-only segments are skipped.
 * - Returns at minimum the "WEBVTT" header (valid empty caption file).
 * - Cues are 1-indexed and separated by blank lines per spec.
 *
 * @param segments - Timed caption segments from faster-whisper or OpenAI Whisper.
 * @returns UTF-8 WebVTT string ready for upload and `<track>` consumption.
 */
export function formatToWebVTT(segments: WhisperSegment[]): string {
  const cues = segments
    .filter((seg) => seg.text && seg.text.trim().length > 0)
    .map((seg, i) => {
      const start = formatTimestamp(seg.start);
      const end = formatTimestamp(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}`;
    })
    .join('\n\n');

  return cues.length > 0 ? `WEBVTT\n\n${cues}\n` : 'WEBVTT\n';
}
