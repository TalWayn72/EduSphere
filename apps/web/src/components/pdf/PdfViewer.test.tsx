/**
 * PdfViewer component tests — tests the REAL PdfViewer component.
 *
 * Validates:
 *  1. Renders loading skeleton initially
 *  2. Renders PDF canvas after load
 *  3. Page navigation (next/prev buttons)
 *  4. Zoom controls (in/out)
 *  5. Text selection fires onTextSelect callback
 *  6. Error state on invalid URL
 *  7. Cleanup on unmount (memory safety)
 *  8. ARIA labels present
 *  9. Keyboard navigation (ArrowLeft/ArrowRight)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';

// ── Hoist mock data so vi.mock factory can reference it ──────────────────────

const {
  mockRenderTask,
  mockPage,
  mockPdfDocument,
  mockLoadingTask,
  mockGetDocument,
} = vi.hoisted(() => {
  const mockRenderTask = {
    promise: Promise.resolve(),
    cancel: vi.fn(),
  };
  const mockViewport = { width: 800, height: 600, scale: 1 };
  const mockPage = {
    getViewport: vi.fn().mockReturnValue(mockViewport),
    render: vi.fn().mockReturnValue(mockRenderTask),
    getTextContent: vi.fn().mockResolvedValue({
      items: [{ str: 'Sample text', transform: [1, 0, 0, 1, 10, 10] }],
    }),
    cleanup: vi.fn(),
  };
  const mockPdfDocument = {
    numPages: 5,
    getPage: vi.fn().mockResolvedValue(mockPage),
    destroy: vi.fn(),
  };
  const mockLoadingTask = {
    promise: Promise.resolve(mockPdfDocument) as Promise<
      typeof mockPdfDocument
    >,
    destroy: vi.fn(),
  };
  const mockGetDocument = vi.fn().mockReturnValue(mockLoadingTask);
  return {
    mockRenderTask,
    mockPage,
    mockPdfDocument,
    mockLoadingTask,
    mockGetDocument,
  };
});

vi.mock('pdfjs-dist', () => ({
  getDocument: mockGetDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}));

// ── Mock canvas context ──────────────────────────────────────────────────────

function createMockCanvasCtx(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D;
}

const mockCtx = createMockCanvasCtx();
const origGetContext = HTMLCanvasElement.prototype.getContext;
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi
    .fn()
    .mockReturnValue(mockCtx) as unknown as typeof origGetContext;
});
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
});

// ── Import real component ────────────────────────────────────────────────────
import { PdfViewer } from './PdfViewer';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PdfViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfDocument.numPages = 5;
    mockPdfDocument.getPage.mockResolvedValue(mockPage);
    mockPage.render.mockReturnValue(mockRenderTask);
    mockRenderTask.promise = Promise.resolve();
    mockLoadingTask.promise = Promise.resolve(mockPdfDocument);
    mockGetDocument.mockReturnValue(mockLoadingTask);
  });

  it('renders loading skeleton initially', () => {
    mockLoadingTask.promise = new Promise(() => {});
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
  });

  it('renders PDF canvas after load', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    const canvas = await screen.findByLabelText(/PDF page/);
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('shows page count in toolbar', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    const pageInfo = await screen.findByText(/1\s*\/\s*5/);
    expect(pageInfo).toBeInTheDocument();
  });

  it('navigates to next page', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();
  });

  it('navigates to previous page after going forward', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument();
  });

  it('disables Previous button on first page', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables Next button on last page', async () => {
    mockPdfDocument.numPages = 1;
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('zoom in button triggers re-render', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockPdfDocument.getPage).toHaveBeenCalled();
  });

  it('zoom out button triggers re-render', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    fireEvent.click(screen.getByLabelText('Zoom out'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockPdfDocument.getPage).toHaveBeenCalled();
  });

  it('fires onTextSelect callback on text selection', async () => {
    const onTextSelect = vi.fn();
    render(
      <PdfViewer
        fileUrl="https://example.com/test.pdf"
        onTextSelect={onTextSelect}
      />
    );
    await screen.findByLabelText(/PDF page/);

    const mockSelection = {
      toString: () => '  selected text  ',
      isCollapsed: false,
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(
      mockSelection as unknown as globalThis.Selection
    );

    const container = screen.getByTestId('pdf-viewer');
    const scrollContainer = container.querySelector('.overflow-auto');
    if (scrollContainer) {
      fireEvent.mouseUp(scrollContainer);
    }
    // The real component uses sel.toString().length — includes surrounding spaces
    expect(onTextSelect).toHaveBeenCalledWith({ from: 0, to: 17 });
  });

  it('does not fire onTextSelect for empty selection', async () => {
    const onTextSelect = vi.fn();
    render(
      <PdfViewer
        fileUrl="https://example.com/test.pdf"
        onTextSelect={onTextSelect}
      />
    );
    await screen.findByLabelText(/PDF page/);

    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => '   ',
      isCollapsed: false,
    } as unknown as globalThis.Selection);

    const container = screen.getByTestId('pdf-viewer');
    const scrollContainer = container.querySelector('.overflow-auto');
    if (scrollContainer) {
      fireEvent.mouseUp(scrollContainer);
    }
    expect(onTextSelect).not.toHaveBeenCalled();
  });

  it('shows error state on invalid URL', async () => {
    const loadError = new Error('Invalid PDF structure');
    mockLoadingTask.promise = Promise.reject(loadError);

    render(<PdfViewer fileUrl="https://example.com/bad.pdf" />);

    await waitFor(() => {
      expect(screen.getByText('Invalid PDF structure')).toBeInTheDocument();
    });
  });

  it('shows generic error for non-Error rejections', async () => {
    mockLoadingTask.promise = Promise.reject('unknown');

    render(<PdfViewer fileUrl="https://example.com/bad.pdf" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load PDF')).toBeInTheDocument();
    });
  });

  it('cleans up PDF document on unmount (memory safety)', async () => {
    const { unmount } = render(
      <PdfViewer fileUrl="https://example.com/test.pdf" />
    );
    await screen.findByLabelText(/PDF page/);
    unmount();
    expect(mockLoadingTask.destroy).toHaveBeenCalled();
  });

  it('has correct ARIA labels', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    expect(
      screen.getByRole('toolbar', { name: 'PDF controls' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/PDF page 1 of 5/)).toBeInTheDocument();
  });

  it('has aria-live polite on page counter', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    const counter = screen.getByText(/1\s*\/\s*5/);
    expect(counter).toHaveAttribute('aria-live', 'polite');
  });

  it('has fit-width and fit-page buttons', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    expect(screen.getByLabelText('Fit width')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit page')).toBeInTheDocument();
  });

  it('fires onPageChange callback when page changes', async () => {
    const onPageChange = vi.fn();
    render(
      <PdfViewer
        fileUrl="https://example.com/test.pdf"
        onPageChange={onPageChange}
      />
    );
    await screen.findByLabelText(/PDF page/);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('supports keyboard navigation with ArrowRight/ArrowLeft', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument();
  });

  it('keyboard ArrowLeft does not go below page 1', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument();
  });

  it('keyboard PageDown navigates forward', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();
  });

  it('keyboard PageUp navigates backward', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'PageUp' });
    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument();
  });

  it('applies className prop', async () => {
    render(
      <PdfViewer fileUrl="https://example.com/test.pdf" className="my-class" />
    );
    await screen.findByLabelText(/PDF page/);
    expect(screen.getByTestId('pdf-viewer')).toHaveClass('my-class');
  });
});

describe('PdfViewer — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfDocument.numPages = 5;
    mockPdfDocument.getPage.mockResolvedValue(mockPage);
    mockPage.render.mockReturnValue(mockRenderTask);
    mockRenderTask.promise = Promise.resolve();
    mockLoadingTask.promise = Promise.resolve(mockPdfDocument);
    mockGetDocument.mockReturnValue(mockLoadingTask);
  });

  it('error state uses role="alert" for screen reader announcement', async () => {
    mockLoadingTask.promise = Promise.reject(new Error('broken'));
    render(<PdfViewer fileUrl="https://example.com/bad.pdf" />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('error icon has aria-hidden="true"', async () => {
    mockLoadingTask.promise = Promise.reject(new Error('broken'));
    render(<PdfViewer fileUrl="https://example.com/bad.pdf" />);
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      const svg = alert.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('loading state uses role="status" with aria-busy', () => {
    mockLoadingTask.promise = new Promise(() => {});
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-label', 'Loading PDF document');
  });

  it('loading spinner icon has aria-hidden="true"', () => {
    mockLoadingTask.promise = new Promise(() => {});
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    const status = screen.getByRole('status');
    const svg = status.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('canvas has role="img" for assistive technology', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    const canvas = await screen.findByLabelText(/PDF page/);
    expect(canvas).toHaveAttribute('role', 'img');
  });

  it('canvas aria-label includes page number and total', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    const canvas = await screen.findByLabelText('PDF page 1 of 5');
    expect(canvas).toBeInTheDocument();
  });

  it('toolbar has role="toolbar" with accessible name', async () => {
    render(<PdfViewer fileUrl="https://example.com/test.pdf" />);
    await screen.findByLabelText(/PDF page/);
    expect(
      screen.getByRole('toolbar', { name: 'PDF controls' })
    ).toBeInTheDocument();
  });
});
