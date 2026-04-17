/**
 * PolishedTranscriptPanel — student reading view for AI-polished lecture transcripts.
 *
 * Renders polished blocks as a continuous RTL article:
 * - POLISHED_HEADING  → section divider <h3>
 * - POLISHED_CITATION → isolated <blockquote> with right-border accent
 * - POLISHED_TEXT     → clickable <button> paragraph with time-sync highlight
 *
 * Time-sync: POLISHED_TEXT blocks whose [startTime, endTime) range contains
 * currentTime are highlighted. Active block auto-scrolls into view.
 * Click-to-seek: clicking any block with a startTime calls onSeek(startTime).
 */
import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  PolishedBlock,
  PolishedTranscriptPanelProps,
} from './polished-transcript-reader.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isActiveBlock(
  block: PolishedBlock,
  currentTime: number | undefined
): boolean {
  if (block.blockType !== 'POLISHED_TEXT') return false;
  if (currentTime === undefined || block.startTime == null) return false;
  const end = block.endTime ?? block.startTime + 10;
  return currentTime >= block.startTime && currentTime < end;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface HeadingBlockProps {
  block: PolishedBlock;
}

function HeadingBlock({ block }: HeadingBlockProps) {
  return (
    <h3
      className="text-sm font-semibold pt-4 pb-2 border-b border-border/50 text-foreground text-right"
      data-block-id={block.id}
      data-start-time={block.startTime ?? undefined}
    >
      {block.text}
    </h3>
  );
}

interface CitationBlockProps {
  block: PolishedBlock;
  onSeek?: (time: number) => void;
}

function CitationBlock({ block, onSeek }: CitationBlockProps) {
  const handleClick = () => {
    if (block.startTime != null) {
      onSeek?.(block.startTime);
    }
  };

  return (
    <blockquote
      role="button"
      tabIndex={block.startTime != null ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      className="my-3 pr-4 border-r-2 border-primary/40 text-sm text-muted-foreground italic leading-relaxed text-right cursor-pointer"
      data-block-id={block.id}
      data-start-time={block.startTime ?? undefined}
    >
      {block.text}
    </blockquote>
  );
}

interface TextBlockProps {
  block: PolishedBlock;
  active: boolean;
  activeRef: React.RefObject<HTMLButtonElement | null>;
  onSeek?: (time: number) => void;
}

function TextBlock({ block, active, activeRef, onSeek }: TextBlockProps) {
  const handleClick = () => {
    if (block.startTime != null) {
      onSeek?.(block.startTime);
    }
  };

  return (
    <button
      type="button"
      ref={active ? activeRef : null}
      onClick={handleClick}
      className={`w-full text-right px-2 py-1.5 rounded text-sm leading-relaxed transition-colors ${
        active
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted/50'
      }`}
      data-block-id={block.id}
      data-start-time={block.startTime ?? undefined}
    >
      {block.text}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PolishedTranscriptPanel({
  blocks,
  currentTime,
  onSeek,
  className = '',
}: PolishedTranscriptPanelProps) {
  const { t } = useTranslation('content');
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active block into view whenever currentTime changes.
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentTime]);

  return (
    <ScrollArea
      className={`h-full ${className}`}
      data-testid="polished-transcript-panel"
      dir="rtl"
    >
      <div className="p-3 space-y-1">
        {blocks.length === 0 && (
          <p
            className="text-sm text-muted-foreground text-center py-8"
            dir="rtl"
          >
            {t('polishedTranscript.reader.empty', 'אין תוכן זמין')}
          </p>
        )}

        {blocks.map((block) => {
          if (block.blockType === 'POLISHED_HEADING') {
            return <HeadingBlock key={block.id} block={block} />;
          }

          if (block.blockType === 'POLISHED_CITATION') {
            return (
              <CitationBlock key={block.id} block={block} onSeek={onSeek} />
            );
          }

          // POLISHED_TEXT (default)
          const active = isActiveBlock(block, currentTime);
          return (
            <TextBlock
              key={block.id}
              block={block}
              active={active}
              activeRef={activeRef}
              onSeek={onSeek}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
