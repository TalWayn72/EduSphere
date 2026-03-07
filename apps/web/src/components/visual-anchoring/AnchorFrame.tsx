import React, { useEffect, useState, useCallback } from 'react';

interface AnchorFrameProps {
  activeAnchorId: string | null;
  containerRef: React.RefObject<HTMLElement | null>;
  onFrameClick?: (anchorId: string) => void;
}

interface FrameRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Renders a subtle themed frame around the currently active anchor text.
 * Finds [data-anchor-id] element and positions a border-box overlay.
 * Click on frame → signals sidebar to focus that anchor.
 * Memory-safe: scroll + resize listeners removed on unmount.
 */
export default function AnchorFrame({
  activeAnchorId,
  containerRef,
  onFrameClick,
}: AnchorFrameProps) {
  const [frameRect, setFrameRect] = useState<FrameRect | null>(null);

  const updateFrame = useCallback(() => {
    if (!activeAnchorId || !containerRef.current) {
      setFrameRect(null);
      return;
    }
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-anchor-id="${activeAnchorId}"]`
    );
    if (!el) {
      setFrameRect(null);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setFrameRect({
      top: elRect.top - containerRect.top + containerRef.current.scrollTop,
      left: elRect.left - containerRect.left,
      width: elRect.width,
      height: elRect.height,
    });
  }, [activeAnchorId, containerRef]);

  useEffect(() => {
    updateFrame();
    // Recompute on scroll and resize
    const container = containerRef.current;
    container?.addEventListener('scroll', updateFrame, { passive: true });
    window.addEventListener('resize', updateFrame);
    return () => {
      container?.removeEventListener('scroll', updateFrame);
      window.removeEventListener('resize', updateFrame);
    };
  }, [activeAnchorId, updateFrame, containerRef]);

  if (!frameRect || !activeAnchorId) return null;

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer rounded"
      style={{
        top: frameRect.top - 2,
        left: frameRect.left - 2,
        width: frameRect.width + 4,
        height: frameRect.height + 4,
        border: '1.5px solid hsl(var(--primary) / 0.6)',
        transition: 'top 150ms ease, left 150ms ease, width 150ms ease, height 150ms ease',
        zIndex: 10,
        background: 'hsl(var(--primary) / 0.05)',
      }}
      onClick={() => activeAnchorId && onFrameClick?.(activeAnchorId)}
      data-testid="anchor-frame"
      aria-label="Active anchor frame — click to focus visual aid"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onFrameClick?.(activeAnchorId);
      }}
    />
  );
}
