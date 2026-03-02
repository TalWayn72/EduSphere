import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + String(values[i] ?? ''), ''),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/hooks/useDocumentAnnotations', () => ({
  useDocumentAnnotations: vi.fn(),
}));

vi.mock('@/lib/store', () => ({
  useDocumentUIStore: vi.fn(),
  useUIStore: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
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
  CONTENT_ITEM_QUERY: 'CONTENT_ITEM_QUERY',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { RichDocumentPage } from './RichDocumentPage';
import { useQuery } from 'urql';
import { useDocumentAnnotations } from '@/hooks/useDocumentAnnotations';
import { useDocumentUIStore } from '@/lib/store';
import { AnnotationLayer } from '@/types/annotations';

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultAnnotationsHook = {
  textAnnotations: [],
  allAnnotations: [],
  focusedAnnotationId: null,
  setFocusedAnnotationId: vi.fn(),
  addTextAnnotation: vi.fn().mockResolvedValue(undefined),
  fetching: false,
  error: null,
};

const defaultDocUIStore = {
  documentZoom: 1 as const,
  annotationPanelWidth: 35,
  defaultAnnotationLayer: AnnotationLayer.PERSONAL,
  setDocumentZoom: vi.fn(),
  setAnnotationPanelWidth: vi.fn(),
  setDefaultAnnotationLayer: vi.fn(),
};

function setQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(useQuery).mockReturnValue([
    { fetching: false, data: undefined, error: undefined, ...overrides },
    vi.fn(),
  ] as unknown as ReturnType<typeof useQuery>);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/content/cnt-1']}>
      <RichDocumentPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RichDocumentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDocumentAnnotations).mockReturnValue(defaultAnnotationsHook);
    vi.mocked(useDocumentUIStore).mockReturnValue(defaultDocUIStore);
    setQuery();
  });

  it('renders within Layout', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders the DocumentToolbar', () => {
    renderPage();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('shows skeleton loading blocks while fetching', () => {
    setQuery({ fetching: true });
    const { container } = renderPage();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
  });

  it('shows error banner on query error', () => {
    setQuery({ fetching: false, error: new Error('Network error') });
    renderPage();
    expect(screen.getByText(/Failed to load document/i)).toBeInTheDocument();
  });

  it('does not render panel group when item is null', () => {
    setQuery({ data: { contentItem: null } });
    renderPage();
    expect(screen.queryByTestId('panel-group')).not.toBeInTheDocument();
  });

  it('renders panel group, panels and handle when item is present', () => {
    setQuery({
      data: {
        contentItem: {
          id: 'cnt-1',
          title: 'My Doc',
          contentType: 'RICH_DOCUMENT',
          content: '<p>Hello</p>',
        },
      },
    });
    renderPage();
    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
    expect(screen.getByTestId('panel-handle')).toBeInTheDocument();
    expect(screen.getByTestId('comment-panel')).toBeInTheDocument();
  });

  it('passes document title to DocumentToolbar', () => {
    setQuery({
      data: {
        contentItem: {
          id: 'cnt-1',
          title: 'Awesome Title',
          contentType: 'RICH_DOCUMENT',
          content: '{}',
        },
      },
    });
    renderPage();
    expect(screen.getByTestId('toolbar')).toHaveTextContent('Awesome Title');
  });

  it('renders AnnotatedDocumentViewer when content exists', () => {
    setQuery({
      data: {
        contentItem: {
          id: 'cnt-1',
          title: 'Doc',
          contentType: 'RICH_DOCUMENT',
          content: 'rich content here',
        },
      },
    });
    renderPage();
    expect(screen.getByTestId('doc-viewer')).toHaveTextContent(
      'rich content here'
    );
  });

  it('renders "No content available" when contentType is not RICH_DOCUMENT', () => {
    setQuery({
      data: {
        contentItem: {
          id: 'cnt-1',
          title: 'Video',
          contentType: 'VIDEO',
          content: null,
        },
      },
    });
    renderPage();
    expect(screen.getByText(/No content available/i)).toBeInTheDocument();
  });

  it('does not show selection button or comment form initially', () => {
    setQuery({
      data: {
        contentItem: {
          id: 'cnt-1',
          title: 'Doc',
          contentType: 'RICH_DOCUMENT',
          content: '{}',
        },
      },
    });
    renderPage();
    expect(screen.queryByTestId('selection-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comment-form')).not.toBeInTheDocument();
  });
});
