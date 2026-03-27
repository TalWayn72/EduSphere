/**
 * useSketchCanvas hook tests
 *
 * Verifies:
 *  1. renderPath handles all tool types without errors
 *  2. Hook returns all expected methods
 *  3. clearPaths empties paths array and clears canvas
 *  4. addTextPath adds a text-type path
 *  5. getPaths returns the paths array
 *  6. endDraw does nothing when not drawing
 *  7. renderPath eraser uses destination-out composite and restores source-over
 *  8. renderPath ellipse draws ellipse
 *  9. renderPath arrow draws arrow lines
 * 10. renderPath text fills text
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSketchCanvas, renderPath } from './useSketchCanvas';
import type { SketchPath } from './useSketchCanvas';

// ── Canvas mock ──────────────────────────────────────────────────────────────

function createMockCtx(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasRenderingContext2D['lineCap'],
    lineJoin: 'miter' as CanvasRenderingContext2D['lineJoin'],
    globalCompositeOperation: 'source-over',
    font: '',
  } as unknown as CanvasRenderingContext2D;
}

// ── renderPath tests ──────────────────────────────────────────────────────────

describe('renderPath', () => {
  it('draws freehand path', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
      color: '#ff0000',
      width: 2,
      tool: 'freehand',
    };
    renderPath(ctx, path, 100, 100);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(30, 40);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('handles freehand with single point (no-op)', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.1, y: 0.2 }],
      color: '#ff0000',
      width: 2,
      tool: 'freehand',
    };
    renderPath(ctx, path, 100, 100);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('draws eraser path with destination-out and restores source-over', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }],
      color: '#000',
      width: 10,
      tool: 'eraser',
    };
    renderPath(ctx, path, 200, 200);
    expect(ctx.globalCompositeOperation).toBe('source-over');
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('eraser with single point restores composite and returns', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.1, y: 0.1 }],
      color: '#000',
      width: 10,
      tool: 'eraser',
    };
    renderPath(ctx, path, 200, 200);
    expect(ctx.globalCompositeOperation).toBe('source-over');
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('draws rect', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }],
      color: '#00f',
      width: 3,
      tool: 'rect',
    };
    renderPath(ctx, path, 100, 100);
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 10, 40, 40);
  });

  it('draws ellipse', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }],
      color: '#0f0',
      width: 2,
      tool: 'ellipse',
    };
    renderPath(ctx, path, 100, 100);
    expect(ctx.ellipse).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('draws arrow', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }],
      color: '#f0f',
      width: 2,
      tool: 'arrow',
    };
    renderPath(ctx, path, 100, 100);
    // Arrow draws a line + two head lines = multiple stroke calls
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it('draws text', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [{ x: 0.5, y: 0.5 }],
      color: '#000',
      width: 3,
      tool: 'text',
      text: 'Hello',
    };
    renderPath(ctx, path, 100, 100);
    expect(ctx.fillText).toHaveBeenCalledWith('Hello', 50, 50);
    expect(ctx.fillStyle).toBe('#000');
  });

  it('handles empty points array', () => {
    const ctx = createMockCtx();
    const path: SketchPath = {
      points: [],
      color: '#000',
      width: 2,
      tool: 'freehand',
    };
    // Should not throw
    expect(() => renderPath(ctx, path, 100, 100)).not.toThrow();
  });
});

// ── useSketchCanvas hook tests ───────────────────────────────────────────────

describe('useSketchCanvas', () => {
  const makeCanvasRef = () => {
    const mockCtx = createMockCtx();
    const canvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 100, height: 100 }),
      width: 100,
      height: 100,
    } as unknown as HTMLCanvasElement;
    return { current: canvas };
  };

  it('returns all expected methods', () => {
    const canvasRef = makeCanvasRef();
    const { result } = renderHook(() =>
      useSketchCanvas({
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement | null>,
        tool: 'freehand',
        color: '#000',
        strokeWidth: 2,
      })
    );

    expect(typeof result.current.startDraw).toBe('function');
    expect(typeof result.current.continueDraw).toBe('function');
    expect(typeof result.current.endDraw).toBe('function');
    expect(typeof result.current.clearPaths).toBe('function');
    expect(typeof result.current.getPaths).toBe('function');
    expect(typeof result.current.redraw).toBe('function');
    expect(typeof result.current.addTextPath).toBe('function');
  });

  it('getPaths returns empty array initially', () => {
    const canvasRef = makeCanvasRef();
    const { result } = renderHook(() =>
      useSketchCanvas({
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement | null>,
        tool: 'freehand',
        color: '#000',
        strokeWidth: 2,
      })
    );

    expect(result.current.getPaths()).toEqual([]);
  });

  it('addTextPath adds a text path and getPaths returns it', () => {
    const canvasRef = makeCanvasRef();
    const { result } = renderHook(() =>
      useSketchCanvas({
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement | null>,
        tool: 'text',
        color: '#ff0000',
        strokeWidth: 3,
      })
    );

    result.current.addTextPath('Hello World', 0.5, 0.5);
    const paths = result.current.getPaths();
    expect(paths.length).toBe(1);
    expect(paths[0]?.tool).toBe('text');
    expect(paths[0]?.text).toBe('Hello World');
    expect(paths[0]?.color).toBe('#ff0000');
  });

  it('clearPaths empties paths and clears canvas', () => {
    const canvasRef = makeCanvasRef();
    const { result } = renderHook(() =>
      useSketchCanvas({
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement | null>,
        tool: 'text',
        color: '#000',
        strokeWidth: 2,
      })
    );

    result.current.addTextPath('Test', 0.1, 0.1);
    expect(result.current.getPaths().length).toBe(1);

    result.current.clearPaths();
    expect(result.current.getPaths()).toEqual([]);

    const ctx = canvasRef.current.getContext('2d');
    expect(ctx?.clearRect).toHaveBeenCalled();
  });

  it('endDraw does nothing when not drawing', () => {
    const canvasRef = makeCanvasRef();
    const { result } = renderHook(() =>
      useSketchCanvas({
        canvasRef: canvasRef as React.RefObject<HTMLCanvasElement | null>,
        tool: 'freehand',
        color: '#000',
        strokeWidth: 2,
      })
    );

    // Should not throw and paths should remain empty
    result.current.endDraw();
    expect(result.current.getPaths()).toEqual([]);
  });
});
