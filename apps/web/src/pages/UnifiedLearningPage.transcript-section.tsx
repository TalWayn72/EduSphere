/**
 * TranscriptSection — transcript area within ToolsPanel.
 *
 * Renders a toggle between raw transcript and polished reading view when a
 * polished transcript with DRAFT or PUBLISHED status is available.
 * Falls back to the raw transcript (or enriched scroller for YouTube) when no
 * polished data exists or the toggle is set to 'raw'.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { SyncTranscriptScroller } from '@/components/enriched-transcript/SyncTranscriptScroller';
import { PolishedTranscriptPanel } from '@/components/polished-transcript/PolishedTranscriptPanel';
import { PolishingStatusBadge } from '@/components/polished-transcript/PolishingStatusBadge';
import type { TranscriptSegment } from '@/lib/mock-content-data';
import type { EnrichedTranscriptBlock } from '@/components/enriched-transcript/enriched-transcript.types';
import type { PolishedBlock } from '@/components/polished-transcript/polished-transcript-reader.types';
import type { PolishingStatus } from '@/components/polished-transcript/polished-transcript.types';

type TranscriptView = 'raw' | 'polished';

interface TranscriptSectionProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek: (t: number) => void;
  isYouTube: boolean;
  enrichedBlocks: EnrichedTranscriptBlock[];
  /** Pre-parsed polished blocks. Undefined = not loaded yet / not available. */
  polishedBlocks?: PolishedBlock[];
  /** Status of the polished transcript — only show toggle for DRAFT or PUBLISHED. */
  polishedStatus?: PolishingStatus | null;
}

/** Only show the polished reading toggle for these statuses. */
const READABLE_STATUSES: ReadonlySet<PolishingStatus> = new Set([
  'DRAFT',
  'INSTRUCTOR_REVIEW',
  'APPROVED',
  'PUBLISHED',
]);

export function TranscriptSection({
  transcript,
  currentTime,
  onSeek,
  isYouTube,
  enrichedBlocks,
  polishedBlocks,
  polishedStatus,
}: TranscriptSectionProps) {
  const { t } = useTranslation('content');
  const [view, setView] = useState<TranscriptView>('raw');

  const hasPolished =
    !!polishedBlocks &&
    polishedBlocks.length > 0 &&
    !!polishedStatus &&
    READABLE_STATUSES.has(polishedStatus);

  const showPolished = hasPolished && view === 'polished';

  return (
    <div className="flex-1 overflow-hidden flex flex-col border-t">
      {/* Header — label + optional toggle */}
      <div className="px-3 py-1.5 border-b flex items-center gap-1.5 flex-shrink-0">
        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-semibold">{t('transcript', 'תמלול')}</span>

        {hasPolished && (
          <div
            className="mr-auto flex items-center gap-1"
            role="group"
            aria-label={t('polishedTranscript.reader.polishedToggle', 'תמליל ערוך')}
          >
            {polishedStatus === 'DRAFT' && (
              <PolishingStatusBadge status="DRAFT" className="text-[10px] py-0 px-1.5 h-4" />
            )}
            <button
              type="button"
              onClick={() => setView('raw')}
              aria-pressed={view === 'raw'}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                view === 'raw'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="transcript-toggle-raw"
            >
              {t('polishedTranscript.reader.rawToggle', 'תמליל גולמי')}
            </button>
            <button
              type="button"
              onClick={() => setView('polished')}
              aria-pressed={view === 'polished'}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                view === 'polished'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="transcript-toggle-polished"
            >
              {t('polishedTranscript.reader.polishedToggle', 'תמליל ערוך')}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 transcript-scroll">
        {showPolished ? (
          <PolishedTranscriptPanel
            blocks={polishedBlocks!}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        ) : isYouTube && enrichedBlocks.length > 0 ? (
          <SyncTranscriptScroller
            blocks={enrichedBlocks}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        ) : (
          <TranscriptPanel
            segments={transcript}
            currentTime={currentTime}
            onSeek={onSeek}
          />
        )}
      </div>
    </div>
  );
}
