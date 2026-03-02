/**
 * Tests for DocumentPanel — left content panel of UnifiedLearningPage.
 * Covers: no-document placeholder, LinkViewer (URL content), document viewer mode.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentPanel } from './UnifiedLearningPage.document-panel';
import { AnnotationLayer } from '@/types/annotations';
import type { TextRangeAnnotation } from '@/components/annotation/AnnotationDecorationsPlugin';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant: _v,
    className: _c,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/annotation/AnnotatedDocumentViewer', () => ({
  AnnotatedDocumentViewer: ({
    content,
  }: {
    content: string;
    annotations: TextRangeAnnotation[];
    focusedAnnotationId: string | null;
    onAnnotationClick: (id: string) => void;
    onSelectionChange: (sel: unknown) => void;
  }) => <div data-testid="annotated-document-viewer">{content}</div>,
}));

vi.mock('@/components/annotation/CommentForm', () => ({
  CommentForm: ({
    onSubmit,
    onCancel,
  }: {
    position: { x: number; y: number };
    onSubmit: (text: string, layer: AnnotationLayer) => void;
    onCancel: () => void;
    defaultLayer: AnnotationLayer;
  }) => (
    <div data-testid="comment-form">
      <button onClick={() => onSubmit('test note', AnnotationLayer.PERSONAL)}>submit</button>
      <button onClick={onCancel}>cancel</button>
    </div>
  ),
}));

vi.mock('@/components/annotation/SelectionCommentButton', () => ({
  SelectionCommentButton: ({
    onAddComment,
  }: {
    position: { x: number; y: number };
    onAddComment: (pos: { x: number; y: number }) => void;
  }) => (
    <button
      data-testid="selection-comment-button"
      onClick={() => onAddComment({ x: 100, y: 200 })}
    >
      Add comment
    </button>
  ),
}));

// ─── Default props ─────────────────────────────────────────────────────────────

const baseProps = {
  content: 'Hello document content',
  hasDocument: true,
  textAnnotations: [] as TextRangeAnnotation[],
  focusedAnnotationId: null,
  onAnnotationClick: vi.fn(),
  onAddTextAnnotation: vi.fn(),
  scrollContainerRef: { current: null } as React.RefObject<HTMLDivElement | null>,
  onScroll: vi.fn(),
  documentZoom: 1,
  defaultAnnotationLayer: AnnotationLayer.PERSONAL,
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('DocumentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder when hasDocument is false', () => {
    render(<DocumentPanel {...baseProps} hasDocument={false} content="" />);
    // The fallback text "אין מסמך לתוכן זה" is passed as the second arg to t()
    expect(screen.getByText('אין מסמך לתוכן זה')).toBeDefined();
  });

  it('renders AnnotatedDocumentViewer for plain text content', () => {
    render(<DocumentPanel {...baseProps} />);
    expect(screen.getByTestId('annotated-document-viewer')).toBeDefined();
    expect(screen.getByText('Hello document content')).toBeDefined();
  });

  it('renders LinkViewer (iframe) for http URL content', () => {
    const { container } = render(
      <DocumentPanel {...baseProps} content="http://example.com" />
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute('src')).toBe('http://example.com');
  });

  it('renders LinkViewer (iframe) for https URL content', () => {
    const { container } = render(
      <DocumentPanel {...baseProps} content="https://example.com/page" />
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute('src')).toBe('https://example.com/page');
  });

  it('shows URL in the LinkViewer header bar', () => {
    render(
      <DocumentPanel {...baseProps} content="https://example.com/page" />
    );
    expect(screen.getByText('https://example.com/page')).toBeDefined();
  });

  it('renders open-in-new-window button for link content', () => {
    render(
      <DocumentPanel {...baseProps} content="https://example.com" />
    );
    expect(screen.getByText('פתח בחלון חדש')).toBeDefined();
  });

  it('applies documentZoom via inline style on the inner container', () => {
    const { container } = render(
      <DocumentPanel {...baseProps} documentZoom={1.5} />
    );
    const viewer = container.querySelector('[style*="scale(1.5)"]');
    expect(viewer).not.toBeNull();
  });

  it('passes focusedAnnotationId to the document viewer', () => {
    // AnnotatedDocumentViewer mock ignores the prop but renders content — verifying
    // the component mounts without error when focusedAnnotationId is set.
    render(<DocumentPanel {...baseProps} focusedAnnotationId="ann-42" />);
    expect(screen.getByTestId('annotated-document-viewer')).toBeDefined();
  });

  it('does not show CommentForm initially', () => {
    render(<DocumentPanel {...baseProps} />);
    expect(screen.queryByTestId('comment-form')).toBeNull();
  });

  it('does not show SelectionCommentButton initially', () => {
    render(<DocumentPanel {...baseProps} />);
    expect(screen.queryByTestId('selection-comment-button')).toBeNull();
  });
});
