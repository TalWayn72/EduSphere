/**
 * LiveTranscriptLine — renders a single live transcript segment.
 *
 * - Timestamp (mm:ss) + optional speaker label + text
 * - Partial (isFinal=false): opacity-50 + animate-pulse
 * - Final: full opacity
 * - JargonHighlighter wraps text for jargon term highlights
 * - dir="auto" for Hebrew RTL support
 */
import { JargonHighlighter } from '@/components/enriched-transcript/JargonHighlighter';
import type { JargonHighlight } from '@/components/enriched-transcript/JargonHighlighter';
import type { LiveTranscriptSegment } from '@/types/live-session.types';
import { cn } from '@/lib/utils';

interface LiveTranscriptLineProps {
  segment: LiveTranscriptSegment;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function LiveTranscriptLine({ segment }: LiveTranscriptLineProps) {
  const highlights: JargonHighlight[] = segment.jargonHits.map((h) => ({
    termId: h.termId,
    canonicalForm: h.canonicalForm,
    definitionShort: h.definitionShort,
    start: h.startChar,
    end: h.endChar,
  }));

  return (
    <div
      className={cn(
        'flex gap-2 text-sm py-1 px-2 rounded',
        segment.isFinal
          ? 'opacity-100'
          : 'opacity-50 animate-pulse'
      )}
      data-testid="transcript-line"
      data-final={segment.isFinal}
    >
      {/* Timestamp */}
      <span className="text-xs text-muted-foreground shrink-0 pt-0.5 tabular-nums">
        {formatMs(segment.startMs)}
      </span>

      <div className="flex flex-col gap-0.5 min-w-0">
        {/* Speaker label */}
        {segment.speakerLabel && (
          <span className="text-xs font-semibold text-primary truncate" dir="auto">
            {segment.speakerLabel}
          </span>
        )}

        {/* Text with jargon highlights */}
        <JargonHighlighter
          text={segment.text}
          highlights={highlights}
          className="leading-relaxed break-words"
        />
      </div>
    </div>
  );
}
