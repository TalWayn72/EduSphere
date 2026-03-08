import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface AnchorPosition {
  id: string;
  documentOrder: number;
}

/**
 * Detects which visual anchor is closest to the viewport center.
 * Uses requestAnimationFrame loop, throttled to every 3rd frame (~20fps).
 * Anchors must have data-anchor-id="<id>" attribute in DOM.
 * Memory-safe: rAF handle cancelled on unmount.
 *
 * Performance (G-11): domMap is built ONCE when the anchor list changes,
 * not on every scroll tick. The scroll listener has been removed entirely.
 * For lazy-rendered anchors not yet in DOM, a single querySelector fallback
 * is used per missing anchor per frame — without rebuilding the whole map.
 */
export function useAnchorDetection(
  anchors: AnchorPosition[],
  containerRef: RefObject<HTMLElement | null>
): { activeAnchorId: string | null } {
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  // Cache of anchor DOM elements — rebuilt only when anchor list changes (G-11)
  const domMapRef = useRef<Map<string, HTMLElement>>(new Map());

  // Stable key for detecting anchor list changes without deep equality
  const anchorsKey = anchors.map((a) => a.id).join(',');

  // Rebuild DOM map ONCE when anchor list changes (O(anchors), not on every scroll)
  useEffect(() => {
    const map = new Map<string, HTMLElement>();
    for (const anchor of anchors) {
      const el = document.querySelector<HTMLElement>(
        `[data-anchor-id="${anchor.id}"]`
      );
      if (el) map.set(anchor.id, el);
    }
    domMapRef.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorsKey]);

  useEffect(() => {
    if (anchors.length === 0) {
      setActiveAnchorId(null);
      return;
    }

    const loop = () => {
      rafRef.current = window.requestAnimationFrame(loop);
      frameCountRef.current += 1;
      // Throttle anchor detection to every 3rd frame (~20fps)
      if (frameCountRef.current % 3 !== 0) return;

      const container = containerRef.current;
      if (!container) return;

      const viewportCenterY = container.scrollTop + container.clientHeight / 2;
      let minDistance = Infinity;
      let bestId: string | null = null;
      let bestOrder = Infinity;

      for (const anchor of anchors) {
        // Use cached map; fall back to querySelector for lazy-rendered anchors
        let el = domMapRef.current.get(anchor.id);
        if (!el) {
          const found = document.querySelector<HTMLElement>(
            `[data-anchor-id="${anchor.id}"]`
          );
          if (found) {
            domMapRef.current.set(anchor.id, found);
            el = found;
          }
        }
        if (!el) continue;

        // Use offsetTop which is relative to offsetParent (document container)
        const anchorCenterY = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(anchorCenterY - viewportCenterY);
        // Tie-breaker: same distance → lower document_order wins
        if (
          distance < minDistance ||
          (distance === minDistance && anchor.documentOrder < bestOrder)
        ) {
          minDistance = distance;
          bestId = anchor.id;
          bestOrder = anchor.documentOrder;
        }
      }

      setActiveAnchorId((prev) => (prev !== bestId ? bestId : prev));
    };

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [anchors, anchorsKey, containerRef]);

  return { activeAnchorId };
}
