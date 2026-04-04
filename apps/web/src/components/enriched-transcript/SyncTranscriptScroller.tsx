/**
 * SyncTranscriptScroller — auto-scrolls enriched transcript to match video time.
 *
 * Wraps EnrichedTranscriptPanel and automatically scrolls the active block
 * into view. Click-to-seek: clicking a block seeks the video to that timestamp.
 */
import { useCallback, useEffect, useRef } from 'react';
import { EnrichedTranscriptPanel } from './EnrichedTranscriptPanel';
import type { EnrichedTranscriptBlock } from './enriched-transcript.types';

interface SyncTranscriptScrollerProps {
  blocks: EnrichedTranscriptBlock[];
  currentTime: number;
  onSeek: (time: number) => void;
  onCitationExpand?: (citationId: string) => void;
  autoScroll?: boolean;
  className?: string;
}

function findActiveBlockId(
  blocks: EnrichedTranscriptBlock[],
  time: number,
): string | null {
  let best: EnrichedTranscriptBlock | null = null;
  for (const b of blocks) {
    if (b.startTime == null) continue;
    if (b.startTime <= time) {
      if (!best || b.startTime > (best.startTime ?? 0)) best = b;
    }
  }
  return best?.id ?? null;
}

export function SyncTranscriptScroller({
  blocks,
  currentTime,
  onSeek,
  onCitationExpand,
  autoScroll = true,
  className = '',
}: SyncTranscriptScrollerProps) {
  const prevActiveRef = useRef<string | null>(null);
  const userScrolledRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeBlockId = findActiveBlockId(blocks, currentTime);

  // Auto-scroll to active block when it changes
  useEffect(() => {
    if (!autoScroll || !activeBlockId) return;
    if (activeBlockId === prevActiveRef.current) return;
    if (userScrolledRef.current) return;

    prevActiveRef.current = activeBlockId;
    const el = document.querySelector(`[data-block-id="${activeBlockId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeBlockId, autoScroll]);

  // Detect user scroll and pause auto-scroll for 3s
  const handleWheel = useCallback(() => {
    userScrolledRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      userScrolledRef.current = false;
    }, 3000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleBlockClick = useCallback(
    (block: EnrichedTranscriptBlock) => {
      if (block.startTime != null) {
        userScrolledRef.current = false;
        onSeek(block.startTime);
      }
    },
    [onSeek],
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onWheel={handleWheel} className={className}>
      <EnrichedTranscriptPanel
        blocks={blocks}
        currentTime={currentTime}
        onBlockClick={handleBlockClick}
        onCitationExpand={onCitationExpand}
        mode="student"
      />
    </div>
  );
}
