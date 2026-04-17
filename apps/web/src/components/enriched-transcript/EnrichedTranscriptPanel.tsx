/**
 * EnrichedTranscriptPanel — renders enriched transcript blocks
 * with citation highlighting and visual anchor markers.
 *
 * Blocks are rendered in blockOrder. CITATION blocks show CitationCard inline.
 * HEADING blocks render as section headers. VISUAL_ANCHOR blocks show anchor markers.
 */
import { useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CitationCard } from './CitationCard';
import { InlineCitationBlock } from './InlineCitationBlock';
import { JargonHighlighter } from './JargonHighlighter';
import type { JargonHighlight } from './JargonHighlighter';
import type { EnrichedTranscriptBlock } from './enriched-transcript.types';

interface EnrichedTranscriptPanelProps {
  blocks: EnrichedTranscriptBlock[];
  currentTime?: number;
  onBlockClick?: (block: EnrichedTranscriptBlock) => void;
  onCitationExpand?: (citationId: string) => void;
  mode?: 'authoring' | 'student';
  className?: string;
}

function isActiveBlock(
  block: EnrichedTranscriptBlock,
  currentTime: number | undefined
): boolean {
  if (currentTime === undefined) return false;
  if (block.startTime == null) return false;
  const end = block.endTime ?? block.startTime + 5;
  return currentTime >= block.startTime && currentTime < end;
}

function getBlockText(block: EnrichedTranscriptBlock): string {
  const content = block.content as Record<string, unknown>;
  return (content['text'] as string) ?? '';
}

export function EnrichedTranscriptPanel({
  blocks,
  currentTime,
  onBlockClick,
  onCitationExpand,
  mode = 'student',
  className = '',
}: EnrichedTranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sorted = [...blocks].sort((a, b) => a.blockOrder - b.blockOrder);

  return (
    <ScrollArea
      className={`h-full ${className}`}
      data-testid="enriched-transcript-panel"
      dir="rtl"
    >
      <div ref={containerRef} className="p-3 space-y-2" dir="rtl">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No transcript blocks available yet.
          </p>
        )}
        {sorted.map((block) => {
          const active = isActiveBlock(block, currentTime);

          if (block.blockType === 'HEADING') {
            return (
              <h3
                key={block.id}
                dir="rtl"
                className="text-sm font-semibold text-foreground pt-3 pb-1 text-right"
                data-block-id={block.id}
              >
                {getBlockText(block)}
              </h3>
            );
          }

          if (block.blockType === 'CITATION' && block.citation) {
            return mode === 'student' ? (
              <InlineCitationBlock
                key={block.id}
                citation={block.citation}
                transcriptText={getBlockText(block)}
                isActive={active}
                blockId={block.id}
                onClick={() => onBlockClick?.(block)}
              />
            ) : (
              <CitationCard
                key={block.id}
                citation={block.citation}
                onExpand={onCitationExpand}
              />
            );
          }

          if (block.blockType === 'VISUAL_ANCHOR') {
            return (
              <div
                key={block.id}
                className="flex items-center gap-2 py-1 text-xs text-muted-foreground"
                data-block-id={block.id}
                data-anchor-id={block.anchor?.id}
              >
                <span className="w-1 h-4 rounded bg-primary/40" />
                <span>{block.anchor?.anchorText ?? 'Visual anchor'}</span>
              </div>
            );
          }

          // TEXT block (default) — render through JargonHighlighter if highlights present
          const textContent = getBlockText(block);
          const jargonHighlights = (block.content as Record<string, unknown>)[
            'jargonHighlights'
          ] as JargonHighlight[] | undefined;
          const hasTimestamp = block.startTime != null;

          return (
            <button
              key={block.id}
              type="button"
              dir="rtl"
              onClick={() => onBlockClick?.(block)}
              aria-disabled={!hasTimestamp || undefined}
              title={hasTimestamp ? undefined : 'אין חותמת זמן לבלוק זה'}
              className={`w-full text-right px-2 py-1.5 rounded text-sm leading-relaxed transition-colors ${
                active
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              } ${!hasTimestamp ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
              data-block-id={block.id}
              data-start-time={block.startTime}
            >
              {jargonHighlights && jargonHighlights.length > 0 ? (
                <JargonHighlighter
                  text={textContent}
                  highlights={jargonHighlights}
                />
              ) : (
                textContent
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
