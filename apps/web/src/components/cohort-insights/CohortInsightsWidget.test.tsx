import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CohortInsightsWidget } from './CohortInsightsWidget';

// ── urql mock ─────────────────────────────────────────────────────────────────
vi.mock('urql', () => ({
  useQuery: vi.fn(),
}));

import * as urql from 'urql';

const EMPTY_QUERY_RESULT = [{ data: undefined, fetching: false, error: undefined }] as never;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(urql.useQuery).mockReturnValue(EMPTY_QUERY_RESULT);
});

const DEFAULT_PROPS = {
  conceptId: 'concept-001',
  courseId: 'course-001',
};

describe('CohortInsightsWidget', () => {
  it('renders nothing while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
    ] as never);

    const { container } = render(<CohortInsightsWidget {...DEFAULT_PROPS} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no insights available', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { cohortInsights: { conceptId: 'concept-001', totalPastDiscussions: 0, insights: [] } },
        fetching: false,
        error: undefined,
      },
    ] as never);

    const { container } = render(<CohortInsightsWidget {...DEFAULT_PROPS} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders insights when data is present', async () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          cohortInsights: {
            conceptId: 'concept-001',
            totalPastDiscussions: 12,
            insights: [
              {
                annotationId: 'ann-1',
                content: 'This concept connects to graph traversal.',
                authorCohortLabel: 'Spring 2025 Cohort',
                relevanceScore: 0.95,
              },
              {
                annotationId: 'ann-2',
                content: 'Remember to review BFS first.',
                authorCohortLabel: 'Fall 2024 Cohort',
                relevanceScore: 0.88,
              },
            ],
          },
        },
        fetching: false,
        error: undefined,
      },
    ] as never);

    // Mount to trigger useEffect setMounted
    const { rerender } = render(<CohortInsightsWidget {...DEFAULT_PROPS} />);
    // Force re-render after mount effect fires
    rerender(<CohortInsightsWidget {...DEFAULT_PROPS} />);

    expect(screen.getByText('Past Cohort Insights')).toBeInTheDocument();
    expect(screen.getByText('12 discussions')).toBeInTheDocument();
    expect(screen.getByText('This concept connects to graph traversal.')).toBeInTheDocument();
    expect(screen.getByText('Spring 2025 Cohort')).toBeInTheDocument();
  });

  it('shows singular "discussion" for totalPastDiscussions = 1', async () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          cohortInsights: {
            conceptId: 'concept-001',
            totalPastDiscussions: 1,
            insights: [
              {
                annotationId: 'ann-1',
                content: 'Single insight.',
                authorCohortLabel: 'Winter 2025 Cohort',
                relevanceScore: 0.9,
              },
            ],
          },
        },
        fetching: false,
        error: undefined,
      },
    ] as never);

    const { rerender } = render(<CohortInsightsWidget {...DEFAULT_PROPS} />);
    rerender(<CohortInsightsWidget {...DEFAULT_PROPS} />);

    expect(screen.getByText('1 discussion')).toBeInTheDocument();
    expect(screen.queryByText('1 discussions')).not.toBeInTheDocument();
  });

  it('renders at most 3 insights when more than 3 are returned', async () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          cohortInsights: {
            conceptId: 'concept-001',
            totalPastDiscussions: 5,
            insights: [
              { annotationId: 'a1', content: 'Insight one', authorCohortLabel: 'Cohort A', relevanceScore: 1 },
              { annotationId: 'a2', content: 'Insight two', authorCohortLabel: 'Cohort B', relevanceScore: 0.9 },
              { annotationId: 'a3', content: 'Insight three', authorCohortLabel: 'Cohort C', relevanceScore: 0.8 },
              { annotationId: 'a4', content: 'Insight four', authorCohortLabel: 'Cohort D', relevanceScore: 0.7 },
              { annotationId: 'a5', content: 'Insight five', authorCohortLabel: 'Cohort E', relevanceScore: 0.6 },
            ],
          },
        },
        fetching: false,
        error: undefined,
      },
    ] as never);

    const { rerender } = render(<CohortInsightsWidget {...DEFAULT_PROPS} />);
    rerender(<CohortInsightsWidget {...DEFAULT_PROPS} />);

    expect(screen.getByText('Insight one')).toBeInTheDocument();
    expect(screen.getByText('Insight two')).toBeInTheDocument();
    expect(screen.getByText('Insight three')).toBeInTheDocument();
    // Fourth and fifth insights should NOT be rendered
    expect(screen.queryByText('Insight four')).not.toBeInTheDocument();
    expect(screen.queryByText('Insight five')).not.toBeInTheDocument();
  });
});
