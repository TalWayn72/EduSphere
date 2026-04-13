/**
 * TranscriptPanel — transcript tab for LiveLessonPage.
 *
 * - useLiveTranscript for live segment feed
 * - Auto-scrolls to bottom on new segments
 * - aria-live="polite" for screen readers
 * - Empty state: "Waiting for transcription..."
 */
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { LiveTranscriptLine } from '@/components/live/LiveTranscriptLine';
import { useLiveTranscript } from '@/hooks/useLiveTranscript';

interface TranscriptPanelProps {
  sessionId: string;
}

export function TranscriptPanel({ sessionId }: TranscriptPanelProps) {
  const { segments, fetching } = useLiveTranscript(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new segments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex-1 overflow-y-auto py-2 space-y-0.5"
        aria-live="polite"
        aria-label="Live transcript"
        aria-atomic="false"
        data-testid="transcript-panel"
      >
        {fetching && segments.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Loading transcript…</span>
          </div>
        )}

        {!fetching && segments.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <p dir="auto">Waiting for transcription...</p>
          </div>
        )}

        {segments.map((seg) => (
          <LiveTranscriptLine
            key={`${seg.segmentIndex}-${seg.isFinal}`}
            segment={seg}
          />
        ))}

        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
