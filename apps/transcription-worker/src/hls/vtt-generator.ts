/**
 * WebVTT generator for transcription segments.
 *
 * Converts an array of timed text segments (as produced by Whisper) into a
 * valid WebVTT string ready for upload and use as a <track> element.
 *
 * Spec reference: https://www.w3.org/TR/webvtt1/
 */

export interface VttSegment {
  /** Start time in seconds (fractional). */
  start: number;
  /** End time in seconds (fractional). */
  end: number;
  /** Cue text content. */
  text: string;
}

/**
 * Formats a time value (seconds) into the WebVTT timestamp format:
 *   HH:MM:SS.mmm
 *
 * @example
 *   formatVttTimestamp(3661.5) // "01:01:01.500"
 */
export function formatVttTimestamp(seconds: number): string {
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
 * Generates a complete WebVTT document from an array of timed segments.
 *
 * Empty/whitespace-only segments are skipped.
 * Returns at minimum the "WEBVTT" header (valid empty cue file).
 *
 * @param segments - Array of Whisper-style timed segments.
 * @returns A UTF-8 string containing the full WebVTT document.
 */
export function generateWebVTT(segments: VttSegment[]): string {
  const cues = segments
    .filter((seg) => seg.text && seg.text.trim().length > 0)
    .map((seg, i) => {
      const start = formatVttTimestamp(seg.start);
      const end = formatVttTimestamp(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}`;
    })
    .join('\n\n');

  return cues.length > 0 ? `WEBVTT\n\n${cues}\n` : 'WEBVTT\n';
}
