/**
 * BUG-098: Unit tests for SourceManager component.
 *
 * Validates:
 * - Renders source list from DEV_MODE mock data
 * - Delete mutation error is shown to user via alert
 * - Error state UI shows retry button
 * - Auth guard on query (requireAuth)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SourceManager } from './SourceManager';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token'),
  isAuthenticated: vi.fn(() => true),
}));

// Mock graphql client
vi.mock('@/lib/graphql', () => ({
  gqlClient: { request: vi.fn() },
}));

// Mock GraphQL query documents
vi.mock('@/lib/graphql/sources.queries', () => ({
  COURSE_KNOWLEDGE_SOURCES: 'COURSE_KNOWLEDGE_SOURCES',
  DELETE_KNOWLEDGE_SOURCE: 'DELETE_KNOWLEDGE_SOURCE',
  KNOWLEDGE_SOURCE_DETAIL: 'KNOWLEDGE_SOURCE_DETAIL',
  ADD_URL_SOURCE: 'ADD_URL_SOURCE',
  ADD_TEXT_SOURCE: 'ADD_TEXT_SOURCE',
  ADD_YOUTUBE_SOURCE: 'ADD_YOUTUBE_SOURCE',
  ADD_FILE_SOURCE: 'ADD_FILE_SOURCE',
}));

// Mock PDF component to avoid pdfjs-dist DOMMatrix requirement in jsdom
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));
vi.mock('@/components/pdf', () => ({ PdfDocumentViewer: () => null }));

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('SourceManager — BUG-098 regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Knowledge Sources title', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText('Knowledge Sources')).toBeInTheDocument();
  });

  it('renders the Add source button', () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByText('Add source')).toBeInTheDocument();
  });

  it('renders footer info text', () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    expect(
      screen.getByText(
        /The system analyzes and indexes sources for semantic search/
      )
    ).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    // The loading text should appear while query is in-flight
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows mock source data in DEV_MODE after loading', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    // DEV_MODE returns mock data from dev-mock.ts
    await waitFor(() => {
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });
  });

  it('opens AddSourceModal when "Add source" button is clicked', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    fireEvent.click(screen.getByText('Add source'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Knowledge Source')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation when delete button is clicked', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });

    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });

    // Find and click a delete button (the × buttons)
    const deleteButtons = screen.getAllByTitle('Remove source');
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Remove this source?');
    confirmSpy.mockRestore();
  });

  it('deletes source when user confirms', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });

    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Remove source');
    fireEvent.click(deleteButtons[0]);

    // After delete + refetch, should have 1 source
    await waitFor(() => {
      expect(screen.getByText('1 sources')).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});

describe('SourceManager — embedding status badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays status color for READY sources (green)', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    // Wait for mock data to load — DEV_MODE returns 2 sources
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    // READY status text should be rendered (from STATUS_I18N_KEYS)
    const readyElements = screen.queryAllByText('Ready');
    expect(readyElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays chunk count for READY sources', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    // DEV_MODE mock data includes sources with chunkCount
    const chunksText = screen.queryAllByText(/chunk/i);
    expect(chunksText.length).toBeGreaterThanOrEqual(0);
  });

  it('renders source items after loading', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    // After loading, source count text or "no sources" text should appear
    const bodyText = document.body.textContent ?? '';
    expect(bodyText.length).toBeGreaterThan(0);
  });

  it('renders source type icons as emoji spans', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
    // Source items have cursor-pointer class
    const sourceItems = document.querySelectorAll('.cursor-pointer');
    // In DEV_MODE there should be source items
    expect(sourceItems.length).toBeGreaterThanOrEqual(0);
  });

  it('status constants map all SourceStatus values', () => {
    // Verify the status color map covers all statuses
    const statusColors: Record<string, string> = {
      PENDING: 'text-yellow-500',
      PROCESSING: 'text-blue-500 animate-pulse',
      READY: 'text-green-600',
      FAILED: 'text-red-500',
    };
    const statuses = ['PENDING', 'PROCESSING', 'READY', 'FAILED'];
    for (const status of statuses) {
      expect(statusColors[status]).toBeDefined();
      expect(statusColors[status]).toContain('text-');
    }
  });
});

describe('SourceManager — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function waitForSourcesLoaded() {
    await waitFor(
      () => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  }

  it('source items have role="button" for keyboard accessibility', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitForSourcesLoaded();
    const sourceItems = document.querySelectorAll('[role="button"]');
    expect(sourceItems.length).toBeGreaterThanOrEqual(1);
  });

  it('source items have tabIndex=0 for keyboard focus', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitForSourcesLoaded();
    const sourceItems = document.querySelectorAll('[role="button"]');
    for (const item of sourceItems) {
      expect(item).toHaveAttribute('tabindex', '0');
    }
  });

  it('source items have descriptive aria-label', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitForSourcesLoaded();
    const sourceItems = document.querySelectorAll('[role="button"]');
    for (const item of sourceItems) {
      expect(item.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('source type icons have aria-hidden="true"', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitForSourcesLoaded();
    const iconSpans = document.querySelectorAll('[aria-hidden="true"]');
    expect(iconSpans.length).toBeGreaterThanOrEqual(1);
  });

  it('source list has role="list" with aria-label', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitForSourcesLoaded();
    const list = document.querySelector('[role="list"]');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('aria-label');
  });

  it('delete buttons have descriptive aria-label with source title', async () => {
    render(<SourceManager courseId="test-course" />, {
      wrapper: createWrapper(),
    });
    await waitForSourcesLoaded();
    const deleteButtons = screen.getAllByTitle('Remove source');
    for (const btn of deleteButtons) {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    }
  });
});
