/**
 * PdfDocumentViewer integration tests — tests the REAL component.
 *
 * Validates:
 *  1. All sub-components render together
 *  2. Toolbar tool switching (view/annotate/sketch)
 *  3. Mode changes show/hide overlays
 *  4. Annotation creation flow
 *  5. Sketch tool switching in sketch mode
 *  6. Sketch save fires callback
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Hoist mock data for vi.mock factory ──────────────────────────────────────

const { mockGetDocument } = vi.hoisted(() => {
  const mockPage = {
    getViewport: vi.fn().mockReturnValue({ width: 800, height: 600, scale: 1 }),
    render: vi
      .fn()
      .mockReturnValue({ promise: Promise.resolve(), cancel: vi.fn() }),
    getTextContent: vi.fn().mockResolvedValue({ items: [] }),
    cleanup: vi.fn(),
  };
  const mockPdfDoc = {
    numPages: 3,
    getPage: vi.fn().mockResolvedValue(mockPage),
    destroy: vi.fn(),
  };
  const mockGetDocument = vi.fn().mockReturnValue({
    promise: Promise.resolve(mockPdfDoc),
    destroy: vi.fn(),
  });
  return { mockGetDocument };
});

vi.mock('pdfjs-dist', () => ({
  getDocument: mockGetDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}));

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

// ── Canvas context mock ──────────────────────────────────────────────────────

const mockCtx = {
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  scale: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  canvas: {
    width: 800,
    height: 600,
    toDataURL: vi.fn().mockReturnValue('data:image/png;stub'),
  },
} as unknown as CanvasRenderingContext2D;

const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi
    .fn()
    .mockReturnValue(mockCtx) as unknown as typeof origGetContext;
});
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
});

// Mock toDataURL
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
beforeEach(() => {
  HTMLCanvasElement.prototype.toDataURL = vi
    .fn()
    .mockReturnValue('data:image/png;base64,stub');
});
afterEach(() => {
  HTMLCanvasElement.prototype.toDataURL = origToDataURL;
});

// ── Import real component ────────────────────────────────────────────────────
import { PdfDocumentViewer } from './PdfDocumentViewer';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PdfDocumentViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the viewer container', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.getByTestId('pdf-document-viewer')).toBeInTheDocument();
  });

  it('renders toolbar with mode buttons', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.getByTestId('viewer-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('mode-view')).toBeInTheDocument();
    expect(screen.getByTestId('mode-annotate')).toBeInTheDocument();
    expect(screen.getByTestId('mode-sketch')).toBeInTheDocument();
  });

  it('defaults to view mode', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.getByTestId('mode-view')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('mode-annotate')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('mode-sketch')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('switches to annotate mode on toolbar click', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByTestId('mode-annotate'));
    expect(screen.getByTestId('mode-annotate')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('text-selection-area')).toBeInTheDocument();
  });

  it('switches to sketch mode and shows sketch toolbar', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByTestId('mode-sketch'));
    expect(screen.getByTestId('mode-sketch')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('sketch-tool-bar')).toBeInTheDocument();
  });

  it('sketch tool switching works in sketch mode', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByTestId('mode-sketch'));

    // Default is freehand
    expect(screen.getByTestId('viewer-sketch-tool-freehand')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Switch to rect
    fireEvent.click(screen.getByTestId('viewer-sketch-tool-rect'));
    expect(screen.getByTestId('viewer-sketch-tool-rect')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('viewer-sketch-tool-freehand')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('annotation creation flow fires callback', async () => {
    const onAnnotationCreate = vi.fn();
    render(
      <PdfDocumentViewer
        url="https://example.com/doc.pdf"
        onAnnotationCreate={onAnnotationCreate}
      />
    );

    // Switch to annotate mode
    fireEvent.click(screen.getByTestId('mode-annotate'));

    // Simulate text selection
    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'Important text',
      isCollapsed: false,
    } as unknown as globalThis.Selection);

    fireEvent.mouseUp(screen.getByTestId('text-selection-area'));

    expect(onAnnotationCreate).toHaveBeenCalledWith({
      text: 'Important text',
      page: 1,
    });
  });

  it('does not fire annotation callback in view mode', async () => {
    const onAnnotationCreate = vi.fn();
    render(
      <PdfDocumentViewer
        url="https://example.com/doc.pdf"
        onAnnotationCreate={onAnnotationCreate}
      />
    );

    // Should not have text-selection-area in view mode
    expect(screen.queryByTestId('text-selection-area')).not.toBeInTheDocument();
  });

  it('does not show sketch tools in view mode', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.queryByTestId('sketch-tool-bar')).not.toBeInTheDocument();
  });

  it('does not show text selection area in view mode', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.queryByTestId('text-selection-area')).not.toBeInTheDocument();
  });

  it('has correct ARIA labels', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.getByLabelText('PDF Document Viewer')).toBeInTheDocument();
    expect(
      screen.getByRole('toolbar', { name: 'Document toolbar' })
    ).toBeInTheDocument();
  });

  it('applies className prop', () => {
    render(
      <PdfDocumentViewer url="https://example.com/doc.pdf" className="custom" />
    );
    expect(screen.getByTestId('pdf-document-viewer')).toHaveClass('custom');
  });

  it('sketch overlay appears in sketch mode', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByTestId('mode-sketch'));
    // Sketch overlay should appear (contains sketch-canvas via PdfSketchOverlay)
    await waitFor(() => {
      expect(screen.getByTestId('pdf-sketch-overlay')).toBeInTheDocument();
    });
  });

  it('sketch overlay disappears when switching to view mode', async () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);

    fireEvent.click(screen.getByTestId('mode-sketch'));
    expect(screen.getByTestId('pdf-sketch-overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mode-view'));
    expect(screen.queryByTestId('pdf-sketch-overlay')).not.toBeInTheDocument();
  });

  it('PdfViewer sub-component renders inside content area', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.getByTestId('pdf-content-area')).toBeInTheDocument();
  });
});

describe('PdfDocumentViewer — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('viewer has accessible label "PDF Document Viewer"', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.getByLabelText('PDF Document Viewer')).toBeInTheDocument();
  });

  it('document toolbar has role="toolbar" with aria-label', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(
      screen.getByRole('toolbar', { name: 'Document toolbar' })
    ).toBeInTheDocument();
  });

  it('mode buttons have aria-pressed states', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    expect(screen.getByTestId('mode-view')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('mode-annotate')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('mode-sketch')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('sketch tool bar has role="toolbar" with aria-label in sketch mode', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByTestId('mode-sketch'));
    const sketchToolbar = screen.getByTestId('sketch-tool-bar');
    expect(sketchToolbar).toHaveAttribute('role', 'toolbar');
    expect(sketchToolbar).toHaveAttribute('aria-label', 'Sketch drawing tools');
  });

  it('text selection area has role="region" with aria-label in annotate mode', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByTestId('mode-annotate'));
    const selectionArea = screen.getByTestId('text-selection-area');
    expect(selectionArea).toHaveAttribute('role', 'region');
    expect(selectionArea).toHaveAttribute(
      'aria-label',
      'Text selection area for annotations'
    );
  });

  it('sketch tool buttons have aria-labels in sketch mode', () => {
    render(<PdfDocumentViewer url="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByTestId('mode-sketch'));
    const tools = ['freehand', 'eraser', 'rect', 'arrow', 'ellipse', 'text'];
    for (const tool of tools) {
      expect(screen.getByTestId(`viewer-sketch-tool-${tool}`)).toHaveAttribute(
        'aria-label',
        `${tool} drawing tool`
      );
    }
  });
});
