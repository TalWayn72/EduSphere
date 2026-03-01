import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// All tiptap / lowlight / katex packages alias to tiptap-stub.ts —
// mock @hocuspocus/provider as the single intercept point.
vi.mock('@hocuspocus/provider', () => ({
  useEditor: vi.fn(() => null),
  EditorContent: ({ editor }: { editor: unknown }) =>
    editor ? <div data-testid="editor-content" /> : null,
  createLowlight: vi.fn(() => ({})),
  lowlight: {},
  default: { configure: vi.fn(() => ({})) },
  Table: { configure: vi.fn(() => ({})) },
  Image: {},
  Mathematics: {},
  HocuspocusProvider: class {},
}));

// Mock the AnnotationDecorationsPlugin to avoid ProseMirror DOM dependencies
vi.mock('@/components/annotation/AnnotationDecorationsPlugin', () => ({
  createAnnotationExtension: vi.fn(() => ({ name: 'annotation-stub' })),
  annotationPluginKey: { key: 'annotations$' },
}));

import { AnnotatedRichDocumentViewer } from './AnnotatedRichDocumentViewer';
import * as TiptapReact from '@tiptap/react';
import { AnnotationLayer } from '@/types/annotations';

const makeAnnotation = (id: string) => ({
  id,
  layer: AnnotationLayer.PERSONAL,
  textRange: { from: 1, to: 5 },
});

const makeEditor = () => {
  const mockTr = { setMeta: vi.fn().mockReturnValue({ type: 'tr' }) };
  const mockState = { tr: mockTr };
  const mockView = { dispatch: vi.fn() };
  return {
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({ focus: vi.fn().mockReturnThis(), run: vi.fn() })),
    state: mockState,
    view: mockView,
    _mockView: mockView,
    _mockTr: mockTr,
  } as unknown as ReturnType<typeof TiptapReact.useEditor>;
};

const defaultProps = {
  content: '{"type":"doc","content":[]}',
  annotations: [makeAnnotation('ann-1')],
  focusedAnnotationId: null as string | null,
  onAnnotationClick: vi.fn(),
};

describe('AnnotatedRichDocumentViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TiptapReact.useEditor).mockReturnValue(null as never);
  });

  it('returns null when editor is not ready', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(null as never);
    const { container } = render(<AnnotatedRichDocumentViewer {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders viewer wrapper when editor is ready', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    const { container } = render(<AnnotatedRichDocumentViewer {...defaultProps} />);
    expect(container.querySelector('.rich-content-viewer')).toBeInTheDocument();
  });

  it('renders EditorContent when editor is ready', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<AnnotatedRichDocumentViewer {...defaultProps} />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('sets editable: false on the editor', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<AnnotatedRichDocumentViewer {...defaultProps} />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0]!
    expect(call?.editable).toBe(false);
  });

  it('applies aria-label and role via editorProps', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<AnnotatedRichDocumentViewer {...defaultProps} />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0]!
    const attrs = call?.editorProps?.attributes as Record<string, string> | undefined;
    expect(attrs?.['aria-label']).toBe('Rich document content');
    expect(attrs?.['role']).toBe('document');
  });

  it('uses empty doc when content is empty string', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<AnnotatedRichDocumentViewer {...defaultProps} content="" />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0]!
    expect(call?.content).toEqual({ type: 'doc', content: [] });
  });

  it('uses empty doc when content is invalid JSON', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<AnnotatedRichDocumentViewer {...defaultProps} content="not json" />);
    const call = vi.mocked(TiptapReact.useEditor).mock.calls[0]![0]!
    expect(call?.content).toEqual({ type: 'doc', content: [] });
  });

  it('calls onAnnotationClick when clicking element with data-annotation-id', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    const onAnnotationClick = vi.fn();
    const { container } = render(
      <AnnotatedRichDocumentViewer
        {...defaultProps}
        onAnnotationClick={onAnnotationClick}
      />
    );

    // Inject a span with data-annotation-id into the wrapper
    const span = document.createElement('span');
    span.setAttribute('data-annotation-id', 'ann-42');
    container.firstChild!.appendChild(span);
    fireEvent.click(span);

    expect(onAnnotationClick).toHaveBeenCalledWith('ann-42');
  });

  it('does not call onAnnotationClick when clicking element without data-annotation-id', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    const onAnnotationClick = vi.fn();
    render(
      <AnnotatedRichDocumentViewer
        {...defaultProps}
        onAnnotationClick={onAnnotationClick}
      />
    );
    // Click the editor-content stub (no data-annotation-id)
    fireEvent.click(screen.getByTestId('editor-content'));
    expect(onAnnotationClick).not.toHaveBeenCalled();
  });

  it('renders without crashing when annotations array is empty', () => {
    vi.mocked(TiptapReact.useEditor).mockReturnValue(makeEditor());
    render(<AnnotatedRichDocumentViewer {...defaultProps} annotations={[]} />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });
});
