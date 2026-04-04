/**
 * useTranscriptSync — bidirectional sync between YouTube player and transcript.
 *
 * Tracks the active block based on currentTime and provides seekToBlock
 * for click-to-seek functionality.
 */
import { useCallback, useMemo, useRef } from 'react';
import type { EnrichedTranscriptBlock } from '@/components/enriched-transcript/enriched-transcript.types';

interface UseTranscriptSyncOptions {
  blocks: EnrichedTranscriptBlock[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export interface UseTranscriptSyncReturn {
  activeBlockId: string | null;
  activeBlockIndex: number;
  seekToBlock: (blockId: string) => void;
  getBlockAtTime: (time: number) => EnrichedTranscriptBlock | null;
}

export function useTranscriptSync({
  blocks,
  currentTime,
  onSeek,
}: UseTranscriptSyncOptions): UseTranscriptSyncReturn {
  const blockMapRef = useRef<Map<string, EnrichedTranscriptBlock>>(new Map());

  // Build sorted block list and map
  const sorted = useMemo(() => {
    const s = [...blocks]
      .filter((b) => b.startTime != null)
      .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0));
    const map = new Map<string, EnrichedTranscriptBlock>();
    for (const b of blocks) map.set(b.id, b);
    blockMapRef.current = map;
    return s;
  }, [blocks]);

  // Find active block at current time (binary-search-like approach)
  const { activeBlockId, activeBlockIndex } = useMemo(() => {
    let bestIdx = -1;
    for (let i = 0; i < sorted.length; i++) {
      const block = sorted[i];
      const st = block?.startTime ?? 0;
      if (st <= currentTime) bestIdx = i;
      else break;
    }
    const bestBlock = bestIdx >= 0 ? sorted[bestIdx] : undefined;
    return {
      activeBlockId: bestBlock?.id ?? null,
      activeBlockIndex: bestIdx,
    };
  }, [sorted, currentTime]);

  const seekToBlock = useCallback(
    (blockId: string) => {
      const block = blockMapRef.current.get(blockId);
      if (block?.startTime != null) onSeek(block.startTime);
    },
    [onSeek]
  );

  const getBlockAtTime = useCallback(
    (time: number): EnrichedTranscriptBlock | null => {
      let best: EnrichedTranscriptBlock | null = null;
      for (const b of sorted) {
        if ((b.startTime ?? 0) <= time) best = b;
        else break;
      }
      return best;
    },
    [sorted]
  );

  return { activeBlockId, activeBlockIndex, seekToBlock, getBlockAtTime };
}
