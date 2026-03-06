/**
 * useSketchCanvas — drawing hook for VideoSketchOverlay.
 * Supports freehand, eraser, rect, arrow, ellipse, and text tools.
 * Text rendering is triggered externally via addTextPath().
 *
 * Memory safety: refs avoid stale-closure issues; canvasRef provided by caller.
 */
import { useRef, useCallback } from 'react';

export type DrawingTool = 'freehand' | 'eraser' | 'rect' | 'arrow' | 'ellipse' | 'text';

export interface SketchPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool?: DrawingTool;
  text?: string;
}

interface Params {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  w: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = Math.max(10, w * 3);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

export function renderPath(
  ctx: CanvasRenderingContext2D,
  path: SketchPath,
  w: number,
  h: number
) {
  const t = path.tool ?? 'freehand';
  ctx.strokeStyle = path.color;
  ctx.lineWidth = path.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (t === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    if (path.points.length < 2) { ctx.globalCompositeOperation = 'source-over'; return; }
    ctx.beginPath();
    path.points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h)
    );
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    return;
  }

  ctx.globalCompositeOperation = 'source-over';
  const p0 = path.points[0];
  const p1 = path.points[1];
  if (!p0) return;

  if (t === 'freehand') {
    if (!p1) return;
    ctx.beginPath();
    ctx.moveTo(p0.x * w, p0.y * h);
    for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i]!.x * w, path.points[i]!.y * h);
    ctx.stroke();
  } else if (t === 'rect' && p1) {
    ctx.beginPath();
    ctx.strokeRect(p0.x * w, p0.y * h, (p1.x - p0.x) * w, (p1.y - p0.y) * h);
  } else if (t === 'ellipse' && p1) {
    const cx = ((p0.x + p1.x) / 2) * w;
    const cy = ((p0.y + p1.y) / 2) * h;
    const rx = Math.max(1, Math.abs((p1.x - p0.x) / 2) * w);
    const ry = Math.max(1, Math.abs((p1.y - p0.y) / 2) * h);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();
  } else if (t === 'arrow' && p1) {
    drawArrow(ctx, p0.x * w, p0.y * h, p1.x * w, p1.y * h, path.width);
  } else if (t === 'text' && path.text) {
    ctx.fillStyle = path.color;
    ctx.font = `${Math.max(14, path.width * 5)}px sans-serif`;
    ctx.fillText(path.text, p0.x * w, p0.y * h);
  }
}

export function useSketchCanvas({ canvasRef, tool, color, strokeWidth }: Params) {
  const drawingRef = useRef(false);
  const pathsRef = useRef<SketchPath[]>([]);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const shapeEndRef = useRef<{ x: number; y: number } | null>(null);
  const currentFreehandRef = useRef<{ x: number; y: number }[]>([]);

  // eslint-disable-next-line no-undef
  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const client = 'touches' in e ? e.touches[0]! : e;
    return { x: (client.clientX - rect.left) / rect.width, y: (client.clientY - rect.top) / rect.height };
  };

  const redraw = useCallback((canvas: HTMLCanvasElement, previewPath?: SketchPath) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pathsRef.current) renderPath(ctx, p, canvas.width, canvas.height);
    if (previewPath) renderPath(ctx, previewPath, canvas.width, canvas.height);
  }, []);

  // eslint-disable-next-line no-undef
  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || tool === 'text') return;
    e.preventDefault();
    drawingRef.current = true;
    const pos = getPos(e, canvas);
    if (tool === 'freehand' || tool === 'eraser') {
      currentFreehandRef.current = [pos];
    } else {
      shapeStartRef.current = pos;
      shapeEndRef.current = null;
    }
  }, [canvasRef, tool]);

  // eslint-disable-next-line no-undef
  const continueDraw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const pos = getPos(e, canvas);
    if (tool === 'freehand' || tool === 'eraser') {
      currentFreehandRef.current.push(pos);
      redraw(canvas, { points: currentFreehandRef.current, color, width: strokeWidth, tool });
    } else if (shapeStartRef.current) {
      shapeEndRef.current = pos;
      redraw(canvas, { points: [shapeStartRef.current, pos], color, width: strokeWidth, tool });
    }
  }, [canvasRef, tool, color, strokeWidth, redraw]);

  const endDraw = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (tool === 'freehand' || tool === 'eraser') {
      if (currentFreehandRef.current.length > 1) {
        pathsRef.current.push({ points: currentFreehandRef.current, color, width: strokeWidth, tool });
      }
      currentFreehandRef.current = [];
    } else if (shapeStartRef.current && shapeEndRef.current) {
      pathsRef.current.push({
        points: [shapeStartRef.current, shapeEndRef.current],
        color, width: strokeWidth, tool,
      });
      shapeStartRef.current = null;
      shapeEndRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) redraw(canvas);
    }
  }, [canvasRef, tool, color, strokeWidth, redraw]);

  const clearPaths = useCallback(() => {
    pathsRef.current = [];
    currentFreehandRef.current = [];
    shapeStartRef.current = null;
    shapeEndRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) { const ctx = canvas.getContext('2d'); ctx?.clearRect(0, 0, canvas.width, canvas.height); }
  }, [canvasRef]);

  const addTextPath = useCallback((text: string, x: number, y: number) => {
    pathsRef.current.push({ points: [{ x, y }], color, width: strokeWidth, tool: 'text', text });
    const canvas = canvasRef.current;
    if (canvas) redraw(canvas);
  }, [canvasRef, color, strokeWidth, redraw]);

  const getPaths = () => pathsRef.current;

  return { startDraw, continueDraw, endDraw, clearPaths, getPaths, redraw, addTextPath };
}
