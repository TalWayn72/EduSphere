/**
 * VideoSketchOverlay tests — G2 canvas sketch overlay.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  VideoSketchOverlay,
  type ExistingSketch,
} from './VideoSketchOverlay';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeOnSave() {
  return vi.fn().mockResolvedValue(undefined);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VideoSketchOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Toggle / inactive state ──────────────────────────────────────────────

  it('renders the Sketch toggle button by default', () => {
    render(
      <VideoSketchOverlay currentTime={30} onSave={makeOnSave()} />
    );
    expect(
      screen.getByTestId('sketch-toggle-btn')
    ).toBeInTheDocument();
  });

  it('does not render the canvas or toolbar when inactive', () => {
    render(
      <VideoSketchOverlay currentTime={30} onSave={makeOnSave()} />
    );
    expect(screen.queryByRole('presentation')).toBeNull();
    expect(screen.queryByTestId('sketch-toolbar')).toBeNull();
  });

  // ── Activating sketch mode ────────────────────────────────────────────────

  it('shows toolbar and hides toggle button after clicking Sketch', () => {
    render(
      <VideoSketchOverlay currentTime={30} onSave={makeOnSave()} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));
    expect(screen.getByTestId('sketch-toolbar')).toBeInTheDocument();
    expect(screen.queryByTestId('sketch-toggle-btn')).toBeNull();
  });

  it('renders the canvas element in active mode', () => {
    render(
      <VideoSketchOverlay currentTime={30} onSave={makeOnSave()} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('canvas has aria-label describing its purpose', () => {
    render(
      <VideoSketchOverlay currentTime={30} onSave={makeOnSave()} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));
    const canvas = document.querySelector('canvas');
    expect(canvas?.getAttribute('aria-label')).toMatch(/sketch/i);
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  it('returns to inactive state when Cancel is clicked', () => {
    render(
      <VideoSketchOverlay currentTime={30} onSave={makeOnSave()} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));
    fireEvent.click(screen.getByTestId('sketch-cancel-btn'));
    expect(screen.getByTestId('sketch-toggle-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('sketch-toolbar')).toBeNull();
  });

  // ── Save ─────────────────────────────────────────────────────────────────

  it('calls onSave with timestamp when Save is clicked with paths', async () => {
    const onSave = makeOnSave();
    render(
      <VideoSketchOverlay currentTime={42} onSave={onSave} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));

    // Simulate a mouse draw: mousedown → mousemove → mouseup
    const canvas = document.querySelector('canvas')!;
    // Create mock for getContext (jsdom does not fully implement canvas)
    const ctx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };
    /* eslint-disable no-undef */
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    /* eslint-enable no-undef */

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
    fireEvent.mouseUp(canvas);

    await act(async () => {
      fireEvent.click(screen.getByTestId('sketch-save-btn'));
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.any(Array),
      42 // currentTime
    );
  });

  it('does not call onSave if no paths drawn', async () => {
    const onSave = makeOnSave();
    render(
      <VideoSketchOverlay currentTime={10} onSave={onSave} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('sketch-save-btn'));
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows "Saving…" text while save is in flight', async () => {
    let resolveSave!: () => void;
    const onSave = vi.fn(
      () => new Promise<void>((res) => { resolveSave = res; })
    );
    render(
      <VideoSketchOverlay currentTime={5} onSave={onSave} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));

    const canvas = document.querySelector('canvas')!;
    const ctx = {
      clearRect: vi.fn(), beginPath: vi.fn(), strokeStyle: '', lineWidth: 0,
      lineCap: '', lineJoin: '', moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    };
    /* eslint-disable no-undef */
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    /* eslint-enable no-undef */

    fireEvent.mouseDown(canvas, { clientX: 5, clientY: 5 });
    fireEvent.mouseMove(canvas, { clientX: 15, clientY: 15 });
    fireEvent.mouseUp(canvas);

    fireEvent.click(screen.getByTestId('sketch-save-btn'));

    // "Saving…" should appear immediately
    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    // Resolve and clean up
    await act(async () => { resolveSave(); });
  });

  // ── Existing sketches (SVG display) ──────────────────────────────────────

  it('renders SVG polylines for existing sketches near current time', () => {
    const sketches: ExistingSketch[] = [
      {
        id: 'sketch-1',
        timestamp: 30,
        paths: [
          {
            points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
            color: '#ef4444',
            width: 3,
          },
        ],
      },
    ];
    render(
      <VideoSketchOverlay
        currentTime={30}
        onSave={makeOnSave()}
        existingSketches={sketches}
      />
    );
    expect(screen.getByTestId('sketch-svg-overlay')).toBeInTheDocument();
    const polyline = document.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    expect(polyline?.getAttribute('stroke')).toBe('#ef4444');
  });

  it('does not render SVG when existing sketches are outside ±3s window', () => {
    const sketches: ExistingSketch[] = [
      {
        id: 'sketch-far',
        timestamp: 100,
        paths: [
          {
            points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }],
            color: '#ef4444',
            width: 3,
          },
        ],
      },
    ];
    render(
      <VideoSketchOverlay
        currentTime={30}
        onSave={makeOnSave()}
        existingSketches={sketches}
      />
    );
    expect(screen.queryByTestId('sketch-svg-overlay')).toBeNull();
  });

  it('does not render SVG overlay when in active drawing mode', () => {
    const sketches: ExistingSketch[] = [
      {
        id: 'sketch-visible',
        timestamp: 30,
        paths: [
          {
            points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }],
            color: '#ef4444',
            width: 3,
          },
        ],
      },
    ];
    render(
      <VideoSketchOverlay
        currentTime={30}
        onSave={makeOnSave()}
        existingSketches={sketches}
      />
    );
    // Activate drawing mode — SVG overlay should disappear (canvas replaces it)
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));
    expect(screen.queryByTestId('sketch-svg-overlay')).toBeNull();
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  // ── Toolbar buttons ───────────────────────────────────────────────────────

  it('renders Save, Clear, and Cancel buttons in active mode', () => {
    render(
      <VideoSketchOverlay currentTime={0} onSave={makeOnSave()} />
    );
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));
    expect(screen.getByTestId('sketch-save-btn')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-cancel-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });
});
