/**
 * PdfSketchOverlay — Canvas drawing overlay for PDF pages.
 *
 * Reuses useSketchCanvas hook from VideoSketchOverlay.
 * Tools: freehand, rectangle, arrow, ellipse, eraser.
 * Color picker, stroke width. Per-page sketch isolation.
 *
 * Memory safety: canvas event listeners + sketch map cleaned on unmount.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSketchCanvas, type DrawingTool } from '../useSketchCanvas';

export interface PdfSketchData {
  page: number;
  dataUrl: string;
}

export interface PdfSketchOverlayProps {
  width: number;
  height: number;
  currentPage: number;
  activeTool: DrawingTool;
  color: string;
  strokeWidth: number;
  onSave?: (sketch: PdfSketchData) => void;
}

const DEFAULT_COLOR = '#ef4444';
const DEFAULT_WIDTH = 3;

export function PdfSketchOverlay({
  width,
  height,
  currentPage,
  activeTool,
  color,
  strokeWidth,
  onSave,
}: PdfSketchOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sketchesRef = useRef<Map<number, string>>(new Map());
  const [currentTool, setCurrentTool] = useState<DrawingTool>(activeTool);
  const [currentColor, setCurrentColor] = useState(color || DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);

  const { startDraw, continueDraw, endDraw, clearPaths } =
    useSketchCanvas({
      canvasRef,
      tool: currentTool,
      color: currentColor,
      strokeWidth: strokeWidth || DEFAULT_WIDTH,
    });

  // Sync external activeTool prop
  useEffect(() => { setCurrentTool(activeTool); }, [activeTool]);
  useEffect(() => { setCurrentColor(color); }, [color]);

  // Attach native canvas event listeners (skip for text tool)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || currentTool === 'text') return;
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', continueDraw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', continueDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw);
    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', continueDraw);
      canvas.removeEventListener('mouseup', endDraw);
      canvas.removeEventListener('mouseleave', endDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', continueDraw);
      canvas.removeEventListener('touchend', endDraw);
    };
  }, [currentTool, startDraw, continueDraw, endDraw]);

  // Save canvas state when page changes; restore if returning to a page
  useEffect(() => {
    const canvas = canvasRef.current;
    const sketches = sketchesRef.current;
    if (!canvas) return;
    // Restore if we have a saved sketch for this page
    const saved = sketches.get(currentPage);
    if (saved) {
      const img = new window.Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.clearRect(0, 0, width, height); ctx.drawImage(img, 0, 0); }
      };
      img.src = saved;
    } else {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, width, height);
    }
    return () => {
      // Save current canvas on page change
      sketches.set(currentPage, canvas.toDataURL());
    };
  }, [currentPage, width, height]);

  // Cleanup on unmount
  useEffect(() => {
    const sketches = sketchesRef.current;
    return () => { sketches.clear(); };
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    const dataUrl = canvas.toDataURL();
    onSave?.({ page: currentPage, dataUrl });
    setSaving(false);
  }, [currentPage, onSave]);

  const handleClear = useCallback(() => {
    clearPaths();
    sketchesRef.current.delete(currentPage);
  }, [clearPaths, currentPage]);

  return (
    <div data-testid="pdf-sketch-overlay" aria-label="Sketch overlay" className="absolute inset-0">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        data-testid="sketch-canvas"
        role="img"
        aria-label={`Sketch drawing canvas for page ${currentPage}`}
        className={cn(
          'absolute inset-0 w-full h-full',
          currentTool === 'text' ? 'cursor-text' : 'cursor-crosshair',
        )}
        style={{ touchAction: 'none' }}
      />
      <div role="toolbar" aria-label="Sketch tools" data-testid="sketch-tools"
        className="absolute top-2 right-2 flex flex-col items-end gap-1.5"
      >
        <div className="flex items-center gap-0.5 bg-black/70 rounded p-1">
          {(['freehand', 'eraser', 'rect', 'arrow', 'ellipse', 'text'] as DrawingTool[]).map(
            (tool) => (
              <button
                key={tool}
                data-testid={`sketch-tool-${tool}`}
                aria-pressed={currentTool === tool}
                aria-label={`${tool} tool`}
                className={cn(
                  'p-1.5 rounded text-white dark:text-gray-100 text-xs transition-colors',
                  currentTool === tool ? 'bg-indigo-600' : 'hover:bg-white/20',
                )}
                onClick={() => setCurrentTool(tool)}
              >
                {tool}
              </button>
            ),
          )}
          <label htmlFor="sketch-color-picker" className="relative cursor-pointer ml-1" aria-label="Stroke color">
            <input
              id="sketch-color-picker"
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              aria-label="Stroke color"
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div
              className="h-5 w-5 rounded border-2 border-white/70 pointer-events-none"
              style={{ backgroundColor: currentColor }}
            />
          </label>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            data-testid="sketch-clear-btn"
            aria-label="Clear sketch"
            className="h-7 px-2 text-[11px] bg-black/60 text-white dark:text-gray-100 hover:bg-black/80 rounded"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            data-testid="sketch-save-btn"
            aria-label="Save sketch"
            className="h-7 px-2 text-[11px] bg-green-600 dark:bg-green-700 hover:bg-green-700 text-white dark:text-gray-100 rounded"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <span data-testid="sketch-page-indicator" aria-label={`Sketching on page ${currentPage}`}
        className="absolute bottom-2 left-2 text-xs bg-black/60 text-white dark:text-gray-100 rounded px-2 py-0.5"
      >
        Page {currentPage}
      </span>
    </div>
  );
}
