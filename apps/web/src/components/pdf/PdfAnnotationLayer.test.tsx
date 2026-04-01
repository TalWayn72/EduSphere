/**
 * PdfAnnotationLayer component tests — tests the REAL component.
 *
 * Validates:
 *  1. Renders annotation highlights on the page
 *  2. Colors match annotation layers (PERSONAL, SHARED, INSTRUCTOR, AI)
 *  3. Click on highlight fires callback
 *  4. Empty annotations = no highlights rendered
 *  5. Multiple annotations on same page
 *  6. Focused annotation gets ring styling
 *  7. spatialData rects render correctly
 *  8. Fallback text-range estimation works
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfAnnotationLayer } from './PdfAnnotationLayer';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

// ── Test data ────────────────────────────────────────────────────────────────

function makeAnnotation(
  overrides: Partial<Annotation> & { id: string }
): Annotation {
  return {
    content: 'test content',
    layer: AnnotationLayer.PERSONAL,
    userId: 'u1',
    userName: 'Test User',
    userRole: 'student',
    timestamp: '2026-01-01T00:00:00Z',
    contentId: 'c1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const ANNOTATIONS: Annotation[] = [
  makeAnnotation({
    id: 'ann-1',
    layer: AnnotationLayer.PERSONAL,
    spatialData: {
      page: 1,
      rects: [{ x: 0.1, y: 0.2, w: 0.5, h: 0.05 }],
    },
  }),
  makeAnnotation({
    id: 'ann-2',
    layer: AnnotationLayer.SHARED,
    spatialData: {
      page: 1,
      rects: [{ x: 0.1, y: 0.4, w: 0.4, h: 0.05 }],
    },
  }),
  makeAnnotation({
    id: 'ann-3',
    layer: AnnotationLayer.INSTRUCTOR,
    spatialData: {
      page: 2,
      rects: [{ x: 0.2, y: 0.3, w: 0.3, h: 0.04 }],
    },
  }),
  makeAnnotation({
    id: 'ann-4',
    layer: AnnotationLayer.AI_GENERATED,
    spatialData: {
      page: 1,
      rects: [{ x: 0.05, y: 0.6, w: 0.6, h: 0.03 }],
    },
  }),
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PdfAnnotationLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders annotation highlights for page 1', () => {
    render(
      <PdfAnnotationLayer
        annotations={ANNOTATIONS}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    expect(screen.getByTestId('pdf-annotation-layer')).toBeInTheDocument();
    // Page 1 has ann-1, ann-2, ann-4 (3 annotations)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(3);
  });

  it('does not render page 2 annotations on page 1', () => {
    render(
      <PdfAnnotationLayer
        annotations={ANNOTATIONS}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    // ann-3 is on page 2 — should not appear
    const buttons = screen.getAllByRole('button');
    const annotationIds = buttons.map((b) =>
      b.getAttribute('data-annotation-id')
    );
    expect(annotationIds).not.toContain('ann-3');
  });

  it('renders page 2 annotation when pageNum is 2', () => {
    render(
      <PdfAnnotationLayer
        annotations={ANNOTATIONS}
        pageNum={2}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0]).toHaveAttribute('data-annotation-id', 'ann-3');
  });

  it('PERSONAL layer has blue highlight class', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[0]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toMatch(/bg-blue/);
  });

  it('SHARED layer has green highlight class', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[1]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toMatch(/bg-green/);
  });

  it('INSTRUCTOR layer has orange highlight class', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[2]]}
        pageNum={2}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toMatch(/bg-orange/);
  });

  it('AI_GENERATED layer has purple highlight class', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[3]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toMatch(/bg-purple/);
  });

  it('click on highlight fires onAnnotationClick callback', () => {
    const onClick = vi.fn();
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[0]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
        onAnnotationClick={onClick}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith('ann-1');
  });

  it('renders nothing when no annotations match current page', () => {
    render(
      <PdfAnnotationLayer
        annotations={ANNOTATIONS}
        pageNum={99}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    expect(
      screen.queryByTestId('pdf-annotation-layer')
    ).not.toBeInTheDocument();
  });

  it('renders nothing for empty annotations array', () => {
    render(
      <PdfAnnotationLayer
        annotations={[]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    expect(
      screen.queryByTestId('pdf-annotation-layer')
    ).not.toBeInTheDocument();
  });

  it('positions highlight rects based on spatialData', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[0]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    const button = screen.getByRole('button');
    // spatialData rects: x=0.1, y=0.2, w=0.5, h=0.05
    // Expected: left=80, top=120, width=400, height=30
    expect(button.style.left).toBe('80px');
    expect(button.style.top).toBe('120px');
    expect(button.style.width).toBe('400px');
    expect(button.style.height).toBe('30px');
  });

  it('focused annotation gets ring styling', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[0]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
        focusedAnnotationId="ann-1"
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toMatch(/ring-2/);
  });

  it('non-focused annotation does not have ring styling', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[0]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
        focusedAnnotationId="other-id"
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).not.toMatch(/ring-2/);
  });

  it('has ARIA label on each highlight', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[0]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    expect(
      screen.getAllByLabelText(/Annotation highlight/).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('falls back to textRange-based rects when no spatialData rects', () => {
    const ann = makeAnnotation({
      id: 'ann-tr',
      textRange: { from: 10, to: 50 },
      spatialData: { page: 1 },
    });

    render(
      <PdfAnnotationLayer
        annotations={[ann]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    // Should render highlight(s) from text range estimation
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('has aria-label on the annotation layer container', () => {
    render(
      <PdfAnnotationLayer
        annotations={[ANNOTATIONS[0]]}
        pageNum={1}
        canvasWidth={800}
        canvasHeight={600}
      />
    );

    expect(
      screen.getByLabelText(/Annotation highlights on page/)
    ).toBeInTheDocument();
  });
});
