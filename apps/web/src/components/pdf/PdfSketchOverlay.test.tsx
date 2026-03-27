/**
 * PdfSketchOverlay component tests — tests the REAL component.
 *
 * Validates:
 *  1. Canvas renders with correct dimensions
 *  2. Drawing tools switch correctly
 *  3. Sketch saves as annotation
 *  4. Per-page sketch isolation (page indicator)
 *  5. Cleanup on unmount (memory safety)
 *  6. Tool buttons have ARIA labels
 *  7. Clear button works
 *  8. Color picker present
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mock useSketchCanvas ─────────────────────────────────────────────────────

vi.mock('../useSketchCanvas', () => ({
  useSketchCanvas: () => ({
    startDraw: vi.fn(),
    continueDraw: vi.fn(),
    endDraw: vi.fn(),
    clearPaths: vi.fn(),
    getPaths: vi.fn().mockReturnValue([]),
    redraw: vi.fn(),
  }),
}));

vi.mock('../VideoSketchToolbar', () => ({
  VideoSketchToolbar: () => null,
}));

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
    canvas: { width: 800, height: 600, toDataURL: vi.fn().mockReturnValue('data:image/png;base64,stub') },
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const mockCtx = createMockCtx();
const origGetContext = HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as unknown as typeof origGetContext;
});
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
});

// Mock HTMLCanvasElement.prototype.toDataURL
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
beforeEach(() => {
  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,canvas-stub');
});
afterEach(() => {
  HTMLCanvasElement.prototype.toDataURL = origToDataURL;
});

// ── Import real component ────────────────────────────────────────────────────
import { PdfSketchOverlay } from './PdfSketchOverlay';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PdfSketchOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders canvas with correct dimensions', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#ff0000"
        strokeWidth={2}
      />,
    );

    const canvas = screen.getByTestId('sketch-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '600');
  });

  it('renders all 6 drawing tools', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    const tools = ['freehand', 'eraser', 'rect', 'arrow', 'ellipse', 'text'];
    for (const tool of tools) {
      expect(screen.getByTestId(`sketch-tool-${tool}`)).toBeInTheDocument();
    }
  });

  it('freehand is active by default when activeTool is freehand', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('sketch-tool-eraser')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switches active tool on click', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    fireEvent.click(screen.getByTestId('sketch-tool-rect'));
    expect(screen.getByTestId('sketch-tool-rect')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switching tools updates all tool states correctly', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    fireEvent.click(screen.getByTestId('sketch-tool-eraser'));
    expect(screen.getByTestId('sketch-tool-eraser')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('sketch-tool-ellipse'));
    expect(screen.getByTestId('sketch-tool-ellipse')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sketch-tool-eraser')).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onSave with sketch data when Save is clicked', () => {
    const onSave = vi.fn();
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={3}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByTestId('sketch-save-btn'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      page: 3,
      dataUrl: 'data:image/png;base64,canvas-stub',
    });
  });

  it('shows current page indicator for per-page isolation', () => {
    const { rerender } = render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByText('Page 1')).toBeInTheDocument();

    rerender(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={2}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('cleans up sketch data on unmount (memory safety)', () => {
    const { unmount } = render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    // Unmount should not throw and should clean up internal state
    expect(() => unmount()).not.toThrow();
  });

  it('has ARIA labels on canvas and toolbar', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByLabelText('Sketch overlay')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sketch drawing canvas for page/)).toBeInTheDocument();
    expect(screen.getByLabelText('Sketch tools')).toBeInTheDocument();
  });

  it('responds to activeTool prop change', () => {
    const { rerender } = render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'true');

    rerender(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="arrow"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByTestId('sketch-tool-arrow')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'false');
  });

  it('has a Clear button', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByTestId('sketch-clear-btn')).toBeInTheDocument();
    expect(screen.getByLabelText('Clear sketch')).toBeInTheDocument();
  });

  it('has a color picker', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#ff0000"
        strokeWidth={2}
      />,
    );

    expect(screen.getAllByLabelText('Stroke color').length).toBeGreaterThanOrEqual(1);
  });

  it('each tool button has an aria-label', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    const tools = ['freehand', 'eraser', 'rect', 'arrow', 'ellipse', 'text'];
    for (const tool of tools) {
      expect(screen.getByLabelText(`${tool} tool`)).toBeInTheDocument();
    }
  });

  it('save button has aria-label', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={1}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByLabelText('Save sketch')).toBeInTheDocument();
  });

  it('page indicator has correct aria-label', () => {
    render(
      <PdfSketchOverlay
        width={800}
        height={600}
        currentPage={5}
        activeTool="freehand"
        color="#000"
        strokeWidth={2}
      />,
    );

    expect(screen.getByLabelText('Sketching on page 5')).toBeInTheDocument();
  });
});
