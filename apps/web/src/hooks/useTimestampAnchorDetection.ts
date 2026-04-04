/**
 * useTimestampAnchorDetection — time-based anchor switching for video content.
 *
 * Instead of scroll-based detection (useAnchorDetection), this hook determines
 * the active visual anchor based on the current video timestamp.
 */
import { useMemo } from 'react';

interface TimestampAnchor {
  id: string;
  startTime: number | null;
  endTime: number | null;
  documentOrder: number;
}

interface UseTimestampAnchorDetectionOptions {
  anchors: TimestampAnchor[];
  currentTime: number;
}

export interface UseTimestampAnchorDetectionReturn {
  activeAnchorId: string | null;
  activeAnchorIndex: number;
}

export function useTimestampAnchorDetection({
  anchors,
  currentTime,
}: UseTimestampAnchorDetectionOptions): UseTimestampAnchorDetectionReturn {
  const sorted = useMemo(
    () =>
      [...anchors]
        .filter((a) => a.startTime != null)
        .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0)),
    [anchors]
  );

  const { activeAnchorId, activeAnchorIndex } = useMemo(() => {
    let bestIdx = -1;
    for (let i = 0; i < sorted.length; i++) {
      const anchor = sorted[i];
      if (!anchor) continue;
      const start = anchor.startTime ?? 0;
      const end = anchor.endTime ?? Infinity;
      if (currentTime >= start && currentTime < end) {
        return { activeAnchorId: anchor.id, activeAnchorIndex: i };
      }
      // Fallback: last anchor whose start_time we passed
      if (start <= currentTime) bestIdx = i;
    }
    const bestAnchor = bestIdx >= 0 ? sorted[bestIdx] : undefined;
    return {
      activeAnchorId: bestAnchor?.id ?? null,
      activeAnchorIndex: bestIdx,
    };
  }, [sorted, currentTime]);

  return { activeAnchorId, activeAnchorIndex };
}
