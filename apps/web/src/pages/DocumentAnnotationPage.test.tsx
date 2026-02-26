import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock all heavy dependencies
vi.mock('urql', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/hooks/useDocumentAnnotations', () => ({
  useDocumentAnnotations: vi.fn(),
}));

vi.mock('@/lib/store', () => ({
  useDocumentUIStore: vi.fn(),
  useUIStore: vi.fn(),
}));

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="panel-handle" />,
}));

vi.mock('@/components/annotation/AnnotatedDocumentViewer', () => ({
  AnnotatedDocumentViewer: ({ content }: { content: string }) => (
    <div data-testid="doc-viewer">{content}</div>
  ),
}));

vi.mock('@/components/annotation/WordCommentPanel', () => ({
  WordCommentPanel: () => <div data-testid="comment-panel" />,
}));

vi.mock('@/components/annotation/CommentForm', () => ({
  CommentForm: () => <div data-testid="comment-form" />,
}));

vi.mock('@/components/annotation/SelectionCommentButton', () => ({
  SelectionCommentButton: () => <div data-testid="selection-button" />,
}));

vi.mock('@/pages/DocumentAnnotationPage.toolbar', () => ({
  DocumentToolbar: ({ title }: { title: string }) => (
    <div data-testid="toolbar">{title}</div>
  ),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  CONTENT_ITEM_QUERY: 'query ContentItem',
}));

import { DocumentAnnotationPage } from '@/pages/DocumentAnnotationPage';
import { useQuery } from 'urql';
import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useDocumentUIStore } from '@/lib/store';
import { AnnotationLayer } from '@/types/annotations';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/document/doc-1']}>
      <DocumentAnnotationPage />
    </MemoryRouter>
  );
}

const mockAnnotations = [
  {
    id: 'ann-1',
    content: 'Test',
    layer: AnnotationLayer.PERSONAL,
    userId: 'u1',
    userName: 'User',
    userRole: 'student' as const,
    timestamp: '2024-01-01T00:00:00Z',
    contentId: 'doc-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    textRange: { from: 10, to: 50 },
  },
];

describe('DocumentAnnotationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDocumentUIStore).mockReturnValue({
      documentZoom: 1 as const,
      setDocumentZoom: vi.fn(),
      annotationPanelWidth: 35,
      setAnnotationPanelWidth: vi.fn(),
    });
    vi.mocked(useDocumentAnnotations).mockReturnValue({
      textAnnotations: [],
      allAnnotations: [],
      focusedAnnotationId: null,
      setFocusedAnnotationId: vi.fn(),
      addTextAnnotation: vi.fn().mockResolvedValue(undefined),
      fetching: false,
      error: null,
    });
  });

  it('shows loading spinner when fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { fetching: true, data: undefined, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows loading spinner when annotations are fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { fetching: false, data: undefined, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    vi.mocked(useDocumentAnnotations).mockReturnValue({
      textAnnotations: [],
      allAnnotations: [],
      focusedAnnotationId: null,
      setFocusedAnnotationId: vi.fn(),
      addTextAnnotation: vi.fn().mockResolvedValue(undefined),
      fetching: true,
      error: null,
    });
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "Document not found" on error', () => {
    vi.mocked(useQuery).mockReturnValue([
      { fetching: false, data: undefined, error: new Error('Not found') },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText(/Document not found/)).toBeInTheDocument();
  });

  it('shows "Document not found" when data has no contentItem', () => {
    vi.mocked(useQuery).mockReturnValue([
      { fetching: false, data: { contentItem: null }, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText(/Document not found/)).toBeInTheDocument();
  });

  it('renders toolbar, panels and handle on success', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        fetching: false,
        data: {
          contentItem: {
            id: 'doc-1',
            title: 'Test Doc',
            content: '{}',
            contentType: 'RICH_DOCUMENT',
          },
        },
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
    expect(screen.getByTestId('panel-handle')).toBeInTheDocument();
    expect(screen.getByTestId('doc-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('comment-panel')).toBeInTheDocument();
  });

  it('passes document title to toolbar', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        fetching: false,
        data: {
          contentItem: {
            id: 'doc-1',
            title: 'My Document',
            content: '{}',
            contentType: 'RICH_DOCUMENT',
          },
        },
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByTestId('toolbar')).toHaveTextContent('My Document');
  });

  it('does not render selection button or form initially', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        fetching: false,
        data: {
          contentItem: {
            id: 'doc-1',
            title: 'Doc',
            content: '{}',
            contentType: 'RICH_DOCUMENT',
          },
        },
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.queryByTestId('selection-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comment-form')).not.toBeInTheDocument();
  });

  it('passes annotations from hook to comment panel and doc viewer', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        fetching: false,
        data: {
          contentItem: {
            id: 'doc-1',
            title: 'Doc',
            content: 'hello',
            contentType: 'RICH_DOCUMENT',
          },
        },
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    vi.mocked(useDocumentAnnotations).mockReturnValue({
      textAnnotations: [
        {
          id: 'ann-1',
          layer: AnnotationLayer.PERSONAL,
          textRange: { from: 10, to: 50 },
        },
      ],
      allAnnotations: mockAnnotations,
      focusedAnnotationId: null,
      setFocusedAnnotationId: vi.fn(),
      addTextAnnotation: vi.fn().mockResolvedValue(undefined),
      fetching: false,
      error: null,
    });
    renderPage();
    expect(screen.getByTestId('doc-viewer')).toHaveTextContent('hello');
    expect(screen.getByTestId('comment-panel')).toBeInTheDocument();
  });
});
