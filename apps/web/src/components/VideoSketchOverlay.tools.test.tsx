/**
 * VideoSketchOverlay — tools, color picker, eraser, shapes, text (PRD §4.2 regression guard).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoSketchOverlay } from './VideoSketchOverlay';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

function renderOverlay() {
  return render(
    <VideoSketchOverlay currentTime={30} onSave={vi.fn().mockResolvedValue(undefined)} />
  );
}

function activateSketch() {
  fireEvent.click(screen.getByTestId('sketch-toggle-btn'));
}

describe('VideoSketchOverlay — tool selector', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows all 6 tool buttons in active mode', () => {
    renderOverlay();
    activateSketch();
    expect(screen.getByTestId('sketch-tool-freehand')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-eraser')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-rect')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-arrow')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-ellipse')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-text')).toBeInTheDocument();
  });

  it('freehand tool is selected by default (aria-pressed=true)', () => {
    renderOverlay();
    activateSketch();
    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'true');
  });

  it('other tools are not selected by default (aria-pressed=false)', () => {
    renderOverlay();
    activateSketch();
    ['eraser', 'rect', 'arrow', 'ellipse', 'text'].forEach((t) => {
      expect(screen.getByTestId(`sketch-tool-${t}`)).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('clicking eraser selects eraser and deselects freehand', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-eraser'));
    expect(screen.getByTestId('sketch-tool-eraser')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking rect tool selects rect', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-rect'));
    expect(screen.getByTestId('sketch-tool-rect')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking arrow tool selects arrow', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-arrow'));
    expect(screen.getByTestId('sketch-tool-arrow')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking ellipse tool selects ellipse', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-ellipse'));
    expect(screen.getByTestId('sketch-tool-ellipse')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking text tool selects text', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-text'));
    expect(screen.getByTestId('sketch-tool-text')).toHaveAttribute('aria-pressed', 'true');
  });

  it('only one tool is active at a time', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-rect'));
    const allTools = ['freehand', 'eraser', 'rect', 'arrow', 'ellipse', 'text'];
    const selected = allTools.filter(
      (t) => screen.getByTestId(`sketch-tool-${t}`).getAttribute('aria-pressed') === 'true'
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe('rect');
  });
});

describe('VideoSketchOverlay — color picker', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders a color picker input in active mode', () => {
    renderOverlay();
    activateSketch();
    expect(screen.getByTestId('sketch-color-picker')).toBeInTheDocument();
  });

  it('color picker has default red color (#ef4444)', () => {
    renderOverlay();
    activateSketch();
    const picker = screen.getByTestId('sketch-color-picker') as HTMLInputElement;
    expect(picker.value).toBe('#ef4444');
  });

  it('color swatch background reflects the current color', () => {
    renderOverlay();
    activateSketch();
    const swatch = screen.getByTestId('sketch-color-swatch');
    expect(swatch).toHaveStyle({ backgroundColor: '#ef4444' });
  });

  it('changing color updates the swatch', () => {
    renderOverlay();
    activateSketch();
    const picker = screen.getByTestId('sketch-color-picker');
    fireEvent.change(picker, { target: { value: '#3b82f6' } });
    const swatch = screen.getByTestId('sketch-color-swatch');
    expect(swatch).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('color picker is not rendered in inactive mode', () => {
    renderOverlay();
    expect(screen.queryByTestId('sketch-color-picker')).not.toBeInTheDocument();
  });
});

describe('VideoSketchOverlay — text tool', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('clicking canvas in text mode shows a text input', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-text'));
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 200, height: 100,
      right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(canvas, { clientX: 50, clientY: 30 });
    expect(screen.getByTestId('sketch-text-input')).toBeInTheDocument();
  });

  it('text input has correct aria-label', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-text'));
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 200, height: 100,
      right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(canvas, { clientX: 50, clientY: 30 });
    const input = screen.getByTestId('sketch-text-input');
    expect(input).toHaveAttribute('aria-label', 'Type text annotation');
  });

  it('pressing Enter on text input hides the text input', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-text'));
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 200, height: 100,
      right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(canvas, { clientX: 50, clientY: 30 });
    const input = screen.getByTestId('sketch-text-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByTestId('sketch-text-input')).not.toBeInTheDocument();
  });

  it('canvas cursor changes to text when text tool is active', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-text'));
    const canvas = document.querySelector('canvas')!;
    expect(canvas.className).toContain('cursor-text');
  });

  it('canvas cursor is crosshair for non-text tools', () => {
    renderOverlay();
    activateSketch();
    const canvas = document.querySelector('canvas')!;
    expect(canvas.className).toContain('cursor-crosshair');
  });
});

describe('VideoSketchOverlay — eraser tool integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('eraser draws with destination-out composite operation', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-eraser'));

    const canvas = document.querySelector('canvas')!;
    const operations: string[] = [];
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
      get globalCompositeOperation() { return operations[operations.length - 1] ?? 'source-over'; },
      set globalCompositeOperation(v: string) { operations.push(v); },
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
      right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);

    // Draw a path with eraser
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });

    // destination-out should have been set during the redraw preview
    expect(operations).toContain('destination-out');
  });
});

describe('VideoSketchOverlay — cancel resets tool and color', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('cancelling resets tool to freehand and color to default', () => {
    renderOverlay();
    activateSketch();
    fireEvent.click(screen.getByTestId('sketch-tool-rect'));
    const picker = screen.getByTestId('sketch-color-picker');
    fireEvent.change(picker, { target: { value: '#0000ff' } });

    fireEvent.click(screen.getByTestId('sketch-cancel-btn'));
    // Re-activate
    fireEvent.click(screen.getByTestId('sketch-toggle-btn'));

    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute('aria-pressed', 'true');
    const repicker = screen.getByTestId('sketch-color-picker') as HTMLInputElement;
    expect(repicker.value).toBe('#ef4444');
  });
});
