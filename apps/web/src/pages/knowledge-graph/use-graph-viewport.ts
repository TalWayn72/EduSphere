import { useState, useRef, useCallback, useEffect } from 'react';

export function useGraphViewport() {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Attach wheel listener as non-passive so preventDefault() works
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(3, Math.max(0.3, s * delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as SVGElement).closest('g[data-node]')) return;
      isPanning.current = true;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: translate.x,
        ty: translate.y,
      };
    },
    [translate]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setTranslate({
      x: panStart.current.tx + (e.clientX - panStart.current.x),
      y: panStart.current.ty + (e.clientY - panStart.current.y),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(3, s * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(0.3, s / 1.2));
  }, []);

  return {
    scale,
    translate,
    svgRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetView,
    zoomIn,
    zoomOut,
  };
}
