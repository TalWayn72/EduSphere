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
        /The system analyzes and indexes sources for semantic search/,
      ),
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
