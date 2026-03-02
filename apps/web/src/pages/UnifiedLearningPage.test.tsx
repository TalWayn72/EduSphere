import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UnifiedLearningPage } from './UnifiedLearningPage';
import { AnnotationLayer } from '@/types/annotations';

/* ── urql ── */
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + String(values[i] ?? ''), ''),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
  ]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}));

/* ── Layout wrapper ── */
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

/* ── Resizable panels — render children directly ── */
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resize-handle" />,
}));

/* ── ContentViewerBreadcrumb ── */
vi.mock('@/components/ContentViewerBreadcrumb', () => ({
  ContentViewerBreadcrumb: ({
    contentId,
    contentTitle,
  }: {
    contentId: string;
    contentTitle: string;
  }) => (
    <nav data-testid="breadcrumb">
      <span data-testid="breadcrumb-id">{contentId}</span>
      <span data-testid="breadcrumb-title">{contentTitle}</span>
    </nav>
  ),
}));

/* ── Sub-panels ── */
vi.mock('@/pages/UnifiedLearningPage.document-panel', () => ({
  DocumentPanel: ({
    content,
    hasDocument,
  }: {
    content: string;
    hasDocument: boolean;
  }) => (
    <div data-testid="document-panel" data-has-doc={String(hasDocument)}>
      {content && <span data-testid="doc-content">{content.slice(0, 20)}</span>}
    </div>
  ),
}));

vi.mock('@/pages/UnifiedLearningPage.tools-panel', () => ({
  ToolsPanel: ({
    videoUrl,
    transcript,
  }: {
    videoUrl: string | undefined;
    transcript: { id: string }[];
  }) => (
    <div data-testid="tools-panel">
      {videoUrl && <span data-testid="video-url">{videoUrl}</span>}
      <span data-testid="transcript-count">{transcript.length}</span>
    </div>
  ),
}));

/* ── Custom hooks ── */
const mockUseContentData = vi.fn();
vi.mock('@/hooks/useContentData', () => ({
  useContentData: (id: string) => mockUseContentData(id),
}));

vi.mock('@/hooks/useAnnotations', () => ({
  useAnnotations: () => ({
    annotations: [],
    fetching: false,
    addAnnotation: vi.fn(),
    addReply: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAgentChat', () => ({
  useAgentChat: () => ({ messages: [], send: vi.fn(), loading: false }),
}));

vi.mock('@/hooks/useDocumentAnnotations', () => ({
  useDocumentAnnotations: () => ({
    textAnnotations: [],
    focusedAnnotationId: null,
    setFocusedAnnotationId: vi.fn(),
    addTextAnnotation: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDocumentScrollMemory', () => ({
  useDocumentScrollMemory: () => ({ saveScrollPosition: vi.fn() }),
}));

vi.mock('@/lib/store', () => ({
  useDocumentUIStore: () => ({
    documentZoom: 1,
    defaultAnnotationLayer: AnnotationLayer.PERSONAL,
  }),
}));

/* ── i18n ── */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

/* ── Auth (needed by Layout → UserMenu etc.) ── */
vi.mock('@/lib/auth', () => ({ getCurrentUser: () => null }));

/* ── urql (used by useSrsQueueCount inside Layout) ── */
vi.mock('@/hooks/useSrsQueueCount', () => ({
  useSrsQueueCount: () => 0,
}));

vi.mock('@/components/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

/* ── Mock content data ── */
vi.mock('@/lib/mock-content-data', () => ({
  mockDocumentContent: 'Mock document content for testing.',
}));

const defaultContentData = {
  videoUrl: 'https://example.com/video.mp4',
  hlsManifestUrl: undefined,
  videoTitle: 'Test Video',
  transcript: [{ id: 't1', start: 0, end: 5, text: 'Hello world' }],
};

import * as urql from 'urql';

function renderPage(
  contentId = 'content-1',
  searchParams = '',
  queryResult: { data?: unknown; fetching?: boolean; error?: Error } = {}
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: queryResult.data ?? undefined,
      fetching: queryResult.fetching ?? false,
      error: queryResult.error ?? undefined,
    } as never,
    vi.fn(),
  ] as never);

  return render(
    <MemoryRouter
      initialEntries={[
        `/learn/${contentId}${searchParams ? '?' + searchParams : ''}`,
      ]}
    >
      <Routes>
        <Route path="/learn/:contentId" element={<UnifiedLearningPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('UnifiedLearningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseContentData.mockReturnValue(defaultContentData);
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined } as never,
      vi.fn(),
    ] as never);
  });

  it('renders the layout shell', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders the breadcrumb', () => {
    renderPage('content-1');
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb-id')).toHaveTextContent('content-1');
  });

  it('renders the document panel', () => {
    renderPage();
    expect(screen.getByTestId('document-panel')).toBeInTheDocument();
  });

  it('renders the tools panel', () => {
    renderPage();
    expect(screen.getByTestId('tools-panel')).toBeInTheDocument();
  });

  it('shows resizable panel group', () => {
    renderPage();
    expect(screen.getByTestId('panel-group')).toBeInTheDocument();
  });

  it('shows video URL from useContentData in tools panel', () => {
    renderPage();
    expect(screen.getByTestId('video-url')).toHaveTextContent(
      'https://example.com/video.mp4'
    );
  });

  it('uses video title as breadcrumb title when no content item', () => {
    renderPage();
    expect(screen.getByTestId('breadcrumb-title')).toHaveTextContent(
      'Test Video'
    );
  });

  it('uses content item title when query returns data', () => {
    renderPage('content-1', '', {
      data: {
        contentItem: {
          id: 'content-1',
          title: 'Fetched Title',
          contentType: 'MARKDOWN',
          content: '# Hello',
        },
      },
    });
    expect(screen.getByTestId('breadcrumb-title')).toHaveTextContent(
      'Fetched Title'
    );
  });

  it('passes hasDocument=true for document content types', () => {
    renderPage('content-1', '', {
      data: {
        contentItem: {
          id: 'content-1',
          title: 'Doc',
          contentType: 'MARKDOWN',
          content: '# Hello',
        },
      },
    });
    expect(screen.getByTestId('document-panel')).toHaveAttribute(
      'data-has-doc',
      'true'
    );
  });

  it('passes hasDocument=false for video content type', () => {
    renderPage('content-1', '', {
      data: {
        contentItem: {
          id: 'content-1',
          title: 'Video',
          contentType: 'VIDEO',
          content: null,
        },
      },
    });
    // VIDEO type → not in DOC_TYPES → hasDocument = false (no doc content either)
    expect(screen.getByTestId('document-panel')).toHaveAttribute(
      'data-has-doc',
      'false'
    );
  });

  it('uses mock content when gateway returns error', () => {
    renderPage('content-1', '', { error: new Error('Gateway error') });
    expect(screen.getByTestId('doc-content')).toHaveTextContent(
      'Mock document'
    );
  });

  it('passes transcript from useContentData to tools panel', () => {
    renderPage();
    expect(screen.getByTestId('transcript-count')).toHaveTextContent('1');
  });

  it('passes empty transcript when useContentData returns none', () => {
    mockUseContentData.mockReturnValue({
      ...defaultContentData,
      transcript: [],
    });
    renderPage();
    expect(screen.getByTestId('transcript-count')).toHaveTextContent('0');
  });
});
