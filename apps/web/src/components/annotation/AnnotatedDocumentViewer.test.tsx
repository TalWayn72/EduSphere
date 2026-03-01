/**
 * AnnotatedDocumentViewer — unit tests
 * Mocks heavy tiptap/ProseMirror stack with a lightweight stub.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotatedDocumentViewer } from './AnnotatedDocumentViewer';
import { AnnotationLayer } from '@/types/annotations';
import type { TextRangeAnnotation } from './AnnotationDecorationsPlugin';

// ── Stub heavy tiptap dependencies ──────────────────────────────────────────

vi.mock('@/components/editor/RichContentViewer', () => ({
  RichContentViewer: ({
    content,
    onSelectionUpdate,
  }: {
    content: string;
    onSelectionUpdate?: (p: { editor: unknown }) => void;
  }) => (
    <div
      data-testid="rich-content-viewer"
      data-content={content}
      onClick={() =>
        onSelectionUpdate?.({
          editor: {
            state: {
              selection: { empty: false, from: 1, to: 5 },
            },
            view: {
              coordsAtPos: () => ({ left: 100, top: 200 }),
            },
          },
        })
      }
    >
      rich-content
    </div>
  ),
}));

vi.mock('@/components/annotation/AnnotationDecorationsPlugin', () => ({
  createAnnotationExtension: vi.fn(() => ({ name: 'stub' })),
  annotationPluginKey: { key: 'annotations' },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeAnnotation = (id: string): TextRangeAnnotation => ({
  id,
  layer: AnnotationLayer.PERSONAL,
  textRange: { from: 1, to: 5 },
});

const defaultProps = {
  content: '<p>Hello world</p>',
  annotations: [makeAnnotation('ann-1')],
  focusedAnnotationId: null,
  onAnnotationClick: vi.fn(),
  onSelectionChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnnotatedDocumentViewer', () => {
  it('renders the RichContentViewer stub', () => {
    render(<AnnotatedDocumentViewer {...defaultProps} />);
    expect(screen.getByTestId('rich-content-viewer')).toBeInTheDocument();
  });

  it('passes content prop through to RichContentViewer', () => {
    render(
      <AnnotatedDocumentViewer {...defaultProps} content="custom content" />
    );
    expect(
      screen.getByTestId('rich-content-viewer').getAttribute('data-content')
    ).toBe('custom content');
  });

  it('wraps RichContentViewer in a relative div', () => {
    const { container } = render(<AnnotatedDocumentViewer {...defaultProps} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains('relative')).toBe(true);
  });

  it('calls onAnnotationClick when clicking element with data-annotation-id', () => {
    const onAnnotationClick = vi.fn();
    const { container } = render(
      <AnnotatedDocumentViewer
        {...defaultProps}
        onAnnotationClick={onAnnotationClick}
      />
    );

    // Simulate clicking a child that has data-annotation-id
    const annotationEl = document.createElement('span');
    annotationEl.setAttribute('data-annotation-id', 'ann-42');
    container.firstChild!.appendChild(annotationEl);

    fireEvent.click(annotationEl);
    expect(onAnnotationClick).toHaveBeenCalledWith('ann-42');
  });

  it('does not call onAnnotationClick when clicking outside annotated element', () => {
    const onAnnotationClick = vi.fn();
    render(
      <AnnotatedDocumentViewer
        {...defaultProps}
        onAnnotationClick={onAnnotationClick}
      />
    );
    fireEvent.click(screen.getByTestId('rich-content-viewer'));
    expect(onAnnotationClick).not.toHaveBeenCalled();
  });

  it('calls onSelectionChange with position when RichContentViewer reports non-empty selection', () => {
    const onSelectionChange = vi.fn();
    render(
      <AnnotatedDocumentViewer
        {...defaultProps}
        onSelectionChange={onSelectionChange}
      />
    );
    // Clicking the stub triggers onSelectionUpdate which calls onSelectionChange
    fireEvent.click(screen.getByTestId('rich-content-viewer'));
    expect(onSelectionChange).toHaveBeenCalledWith({
      x: 100,
      y: 200,
      from: 1,
      to: 5,
    });
  });

  it('renders without crashing when annotations array is empty', () => {
    render(
      <AnnotatedDocumentViewer {...defaultProps} annotations={[]} />
    );
    expect(screen.getByTestId('rich-content-viewer')).toBeInTheDocument();
  });

  it('renders without crashing when focusedAnnotationId is set', () => {
    render(
      <AnnotatedDocumentViewer
        {...defaultProps}
        focusedAnnotationId="ann-1"
      />
    );
    expect(screen.getByTestId('rich-content-viewer')).toBeInTheDocument();
  });

  it('renders without crashing when multiple annotations are provided', () => {
    render(
      <AnnotatedDocumentViewer
        {...defaultProps}
        annotations={[makeAnnotation('a1'), makeAnnotation('a2'), makeAnnotation('a3')]}
      />
    );
    expect(screen.getByTestId('rich-content-viewer')).toBeInTheDocument();
  });
});
