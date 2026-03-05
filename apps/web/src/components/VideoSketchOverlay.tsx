/**
 * VideoSketchOverlay — HTML5 canvas freehand sketch overlay for video annotations (G2).
 *
 * Renders as `absolute inset-0` over a video container.
 * - "Sketch" toggle button activates drawing mode (video should be paused externally).
 * - Mouse/touch events capture freehand paths.
 * - Saves normalized paths (0-1 coords) + timestamp via onSave.
 * - Displays existing sketch annotations as SVG overlays at ±3s of current time.
 *
 * Memory safety: canvas event listeners removed on unmount.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SketchPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface ExistingSketch {
  id: string;
  paths: SketchPath[];
  timestamp: number;
}

interface Props {
  currentTime: number;
  onSave: (paths: SketchPath[], timestamp: number) => Promise<void>;
  existingSketches?: ExistingSketch[];
}

const STROKE_COLOR = '#ef4444';
const STROKE_WIDTH = 3;
const VISIBILITY_WINDOW = 3; // seconds

function useCanvasDrawing(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const drawingRef = useRef(false);
  const pathsRef = useRef<SketchPath[]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const client = 'touches' in e ? e.touches[0]! : e;
    return {
      x: (client.clientX - rect.left) / rect.width,
      y: (client.clientY - rect.top) / rect.height,
    };
  };

  const redraw = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const allPaths = [...pathsRef.current];
    if (currentPathRef.current.length > 1) {
      allPaths.push({ points: currentPathRef.current, color: STROKE_COLOR, width: STROKE_WIDTH });
    }
    for (const path of allPaths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0]!.x * canvas.width, path.points[0]!.y * canvas.height);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i]!.x * canvas.width, path.points[i]!.y * canvas.height);
      }
      ctx.stroke();
    }
  }, []);

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    drawingRef.current = true;
    currentPathRef.current = [getPos(e, canvas)];
  }, [canvasRef]);

  const continueDraw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    currentPathRef.current.push(getPos(e, canvas));
    redraw(canvas);
  }, [canvasRef, redraw]);

  const endDraw = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentPathRef.current.length > 1) {
      pathsRef.current.push({ points: currentPathRef.current, color: STROKE_COLOR, width: STROKE_WIDTH });
    }
    currentPathRef.current = [];
  }, []);

  const clearPaths = useCallback(() => {
    pathsRef.current = [];
    currentPathRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [canvasRef]);

  const getPaths = () => pathsRef.current;

  return { startDraw, continueDraw, endDraw, clearPaths, getPaths, redraw };
}

export function VideoSketchOverlay({ currentTime, onSave, existingSketches = [] }: Props) {
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { startDraw, continueDraw, endDraw, clearPaths, getPaths } = useCanvasDrawing(canvasRef);

  // Attach canvas listeners when active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
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
  }, [active, startDraw, continueDraw, endDraw]);

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
    setActive(false);
  };

  // Visible sketches: existing ones within VISIBILITY_WINDOW of current time
  const visibleSketches = existingSketches.filter(
    (s) => Math.abs(s.timestamp - currentTime) <= VISIBILITY_WINDOW
  );

  return (
    <>
      {/* SVG overlay for displaying existing sketches */}
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

      {/* Drawing canvas (active mode only) */}
      {active && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
          aria-label="Sketch canvas — draw with mouse or touch"
        />
      )}

      {/* Toggle / action buttons */}
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
        <div className="absolute top-2 right-2 flex items-center gap-1.5" data-testid="sketch-toolbar">
          <Button
            size="sm"
            variant="ghost"
            className={cn('h-7 px-2 text-[11px] bg-black/60 text-white hover:bg-black/80', saving && 'opacity-50')}
            onClick={() => clearPaths()}
            disabled={saving}
            aria-label="Clear sketch"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
          <Button
            size="sm"
            className="h-7 px-2 text-[11px] bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSave}
            disabled={saving}
            aria-label="Save sketch annotation"
            data-testid="sketch-save-btn"
          >
            <Check className="h-3 w-3 mr-1" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] bg-black/60 text-white hover:bg-black/80"
            onClick={handleCancel}
            aria-label="Cancel sketch"
            data-testid="sketch-cancel-btn"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </>
  );
}
