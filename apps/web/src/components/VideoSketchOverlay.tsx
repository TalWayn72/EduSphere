/**
 * VideoSketchOverlay — HTML5 canvas sketch overlay for video (PRD §4.2).
 * Tools: freehand, eraser, rect, arrow, ellipse, text + color picker.
 *
 * Renders as `absolute inset-0` over a video container.
 * Memory safety: canvas event listeners removed on unmount via useEffect cleanup.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSketchCanvas, type DrawingTool } from './useSketchCanvas';
import { VideoSketchToolbar } from './VideoSketchToolbar';

// Re-export types for consumers (tests import from this file)
export type { SketchPath } from './useSketchCanvas';

export interface ExistingSketch {
  id: string;
  paths: import('./useSketchCanvas').SketchPath[];
  timestamp: number;
}

interface Props {
  currentTime: number;
  onSave: (paths: import('./useSketchCanvas').SketchPath[], timestamp: number) => Promise<void>;
  existingSketches?: ExistingSketch[];
}

const VISIBILITY_WINDOW = 3;
const DEFAULT_COLOR = '#ef4444';
const DEFAULT_WIDTH = 3;

export function VideoSketchOverlay({ currentTime, onSave, existingSketches = [] }: Props) {
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<DrawingTool>('freehand');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { startDraw, continueDraw, endDraw, clearPaths, getPaths, addTextPath } =
    useSketchCanvas({ canvasRef, tool, color, strokeWidth: DEFAULT_WIDTH });

  // Attach native canvas event listeners (skipped for text tool — handled via onClick)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active || tool === 'text') return;
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
  }, [active, tool, startDraw, continueDraw, endDraw]);

  // Text tool: click on canvas → show positioned <input>
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTextInput({ x, y });
    setTimeout(() => textInputRef.current?.focus(), 0);
  }, [tool]);

  const commitText = useCallback((text: string) => {
    if (text.trim() && textInput) {
      addTextPath(text.trim(), textInput.x, textInput.y);
    }
    setTextInput(null);
  }, [textInput, addTextPath]);

  const handleSave = async () => {
    const paths = getPaths();
    if (paths.length === 0) return;
    setSaving(true);
    try {
      await onSave(paths, currentTime);
      clearPaths();
      setActive(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    clearPaths();
    setTextInput(null);
    setActive(false);
    setTool('freehand');
    setColor(DEFAULT_COLOR);
  };

  const visibleSketches = existingSketches.filter(
    (s) => Math.abs(s.timestamp - currentTime) <= VISIBILITY_WINDOW
  );

  return (
    <>
      {/* SVG overlay for existing sketches (inactive mode only) */}
      {!active && visibleSketches.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden
          data-testid="sketch-svg-overlay"
        >
          {visibleSketches.map((sketch) =>
            sketch.paths.map((path, pi) =>
              path.points.length > 1 ? (
                <polyline
                  key={`${sketch.id}-${pi}`}
                  points={path.points.map((p) => `${p.x},${p.y}`).join(' ')}
                  stroke={path.color}
                  strokeWidth={path.width * 0.003}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.8}
                />
              ) : null
            )
          )}
        </svg>
      )}

      {/* Drawing canvas + text input (active mode) */}
      {active && (
        <div className="absolute inset-0">
          <canvas
            ref={canvasRef}
            className={cn(
              'absolute inset-0 w-full h-full',
              tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
            )}
            style={{ touchAction: 'none' }}
            aria-label="Sketch canvas — draw with mouse or touch"
            onClick={handleCanvasClick}
          />
          {textInput && (
            <input
              ref={textInputRef}
              type="text"
              className="absolute bg-transparent border-b border-white text-white outline-none text-sm min-w-[4rem]"
              style={{ left: `${textInput.x * 100}%`, top: `${textInput.y * 100}%` }}
              onKeyDown={(e) => { if (e.key === 'Enter') commitText(e.currentTarget.value); }}
              onBlur={(e) => commitText(e.currentTarget.value)}
              data-testid="sketch-text-input"
              aria-label="Type text annotation"
            />
          )}
        </div>
      )}

      {/* Toggle button (inactive) / Toolbar (active) */}
      {!active ? (
        <button
          className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white rounded px-2 py-1 text-[11px] font-medium transition-colors"
          onClick={() => setActive(true)}
          aria-label="Activate sketch mode"
          data-testid="sketch-toggle-btn"
        >
          <Pencil className="h-3 w-3" />
          Sketch
        </button>
      ) : (
        <VideoSketchToolbar
          tool={tool}
          color={color}
          saving={saving}
          onToolChange={setTool}
          onColorChange={setColor}
          onClear={clearPaths}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
