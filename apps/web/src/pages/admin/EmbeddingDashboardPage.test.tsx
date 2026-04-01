/**
 * EmbeddingDashboardPage Tests — Sprint 3 enhanced.
 * Covers: reindex confirmation dialog, toast notifications,
 * coverage chart & activity log integration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mock dependencies ──────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      k: string,
      fallbackOrOpts?: string | Record<string, unknown>,
      opts?: Record<string, unknown>
    ) => {
      const fallback = typeof fallbackOrOpts === 'string' ? fallbackOrOpts : k;
      const vars = typeof fallbackOrOpts === 'object' ? fallbackOrOpts : opts;
      if (!vars) return fallback;
      return fallback.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) =>
        vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
      );
    },
  }),
}));

const mockReexecute = vi.fn();
const mockReindex = vi
  .fn()
  .mockResolvedValue({ data: { reindexCourseEmbeddings: { success: true } } });
let mockQueryResult: Record<string, unknown>;
let mockMutationResult: Record<string, unknown>;

vi.mock('urql', () => ({
  useQuery: () => [mockQueryResult, mockReexecute],
  useMutation: () => [mockMutationResult, mockReindex],
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/graphql/embedding.queries', () => ({
  EMBEDDING_STATS_QUERY: 'query EmbeddingStats',
  REINDEX_COURSE_EMBEDDINGS_MUTATION: 'mutation Reindex',
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('./EmbeddingDashboardPage.stats', () => ({
  StatsCards: ({ stats }: { stats: unknown }) => (
    <div data-testid="stats-cards">{JSON.stringify(stats)}</div>
  ),
  CourseTable: () => <div data-testid="course-table" />,
}));

vi.mock('./EmbeddingCoverageChart', () => ({
  EmbeddingCoverageChart: () => <div data-testid="coverage-chart" />,
}));

vi.mock('./EmbeddingActivityLog', () => ({
  EmbeddingActivityLog: () => <div data-testid="activity-log" />,
}));

const MOCK_STATS = {
  totalSources: 50,
  indexedSources: 40,
  pendingSources: 5,
  failedSources: 5,
  totalChunks: 1200,
  courseBreakdown: [
    {
      courseId: 'c1',
      courseTitle: 'AI Basics',
      sourceCount: 20,
      indexedCount: 18,
      chunkCount: 500,
    },
    {
      courseId: 'c2',
      courseTitle: 'ML Advanced',
      sourceCount: 30,
      indexedCount: 22,
      chunkCount: 700,
    },
  ],
};

describe('EmbeddingDashboardPage', () => {
  beforeEach(() => {
    mockQueryResult = {
      data: { embeddingStats: MOCK_STATS },
      fetching: false,
      error: undefined,
    };
    mockMutationResult = { fetching: false };
    mockReexecute.mockClear();
    mockReindex.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
    mockReindex.mockResolvedValue({
      data: { reindexCourseEmbeddings: { success: true } },
    });
  });

  async function renderPage() {
    // Dynamic import to avoid hoisting issues with mocks
    const { EmbeddingDashboardPage } = await import('./EmbeddingDashboardPage');
    return render(<EmbeddingDashboardPage />);
  }

  it('renders the dashboard container', async () => {
    await renderPage();
    expect(screen.getByTestId('embedding-dashboard-page')).toBeInTheDocument();
  });

  it('renders stats cards when data is available', async () => {
    await renderPage();
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
  });

  it('renders coverage chart and activity log', async () => {
    await renderPage();
    expect(screen.getByTestId('coverage-chart')).toBeInTheDocument();
    expect(screen.getByTestId('activity-log')).toBeInTheDocument();
  });

  it('renders course breakdown table', async () => {
    await renderPage();
    expect(screen.getByTestId('course-table')).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching without data', async () => {
    mockQueryResult = { data: undefined, fetching: true, error: undefined };
    await renderPage();
    expect(screen.getByTestId('embedding-skeleton')).toBeInTheDocument();
  });

  it('shows error state on query failure', async () => {
    mockQueryResult = {
      data: undefined,
      fetching: false,
      error: new Error('fail'),
    };
    await renderPage();
    expect(
      screen.getByText(/Failed to load embedding statistics/)
    ).toBeInTheDocument();
  });

  it('opens reindex confirmation dialog on Reindex All click', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('reindex-all-btn'));
    expect(screen.getByTestId('reindex-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Confirm Reindex/)).toBeInTheDocument();
    expect(screen.getByText(/50 sources in 2 courses/)).toBeInTheDocument();
  });

  it('closes dialog on Cancel click', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('reindex-all-btn'));
    expect(screen.getByTestId('reindex-confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reindex-cancel-btn'));
    await waitFor(() => {
      expect(
        screen.queryByTestId('reindex-confirm-dialog')
      ).not.toBeInTheDocument();
    });
  });

  it('calls reindex mutation and shows success toast', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('reindex-all-btn'));
    fireEvent.click(screen.getByTestId('reindex-confirm-btn'));

    await waitFor(() => {
      expect(mockReindex).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('successfully')
      );
    });
  });

  it('shows error toast when reindex mutation fails', async () => {
    mockReindex.mockResolvedValue({ error: new Error('server error') });
    await renderPage();
    fireEvent.click(screen.getByTestId('reindex-all-btn'));
    fireEvent.click(screen.getByTestId('reindex-confirm-btn'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringContaining('failed')
      );
    });
  });

  it('refresh button triggers query reexecution', async () => {
    await renderPage();
    fireEvent.click(screen.getByTestId('refresh-stats-btn'));
    expect(mockReexecute).toHaveBeenCalledWith({
      requestPolicy: 'network-only',
    });
  });

  it('has accessible sr-only heading', async () => {
    await renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('sr-only');
    expect(heading).toHaveTextContent('Embedding Dashboard');
  });
});

describe('EmbeddingDashboardPage — Accessibility', () => {
  beforeEach(() => {
    mockQueryResult = {
      data: { embeddingStats: MOCK_STATS },
      fetching: false,
      error: undefined,
    };
    mockMutationResult = { fetching: false };
  });

  async function renderPage() {
    const { EmbeddingDashboardPage } = await import('./EmbeddingDashboardPage');
    return render(<EmbeddingDashboardPage />);
  }

  it('decorative icons have aria-hidden="true"', async () => {
    await renderPage();
    const dashboard = screen.getByTestId('embedding-dashboard-page');
    const svgs = dashboard.querySelectorAll('svg');
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('loading skeleton has aria-busy="true"', async () => {
    mockQueryResult = { data: undefined, fetching: true, error: undefined };
    await renderPage();
    const skeleton = screen.getByTestId('embedding-skeleton');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('aria-label');
  });

  it('error state uses role="alert"', async () => {
    mockQueryResult = {
      data: undefined,
      fetching: false,
      error: new Error('fail'),
    };
    await renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
