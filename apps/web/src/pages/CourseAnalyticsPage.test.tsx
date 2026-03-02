import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn(() => ({ courseId: 'course-123' })),
  };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'INSTRUCTOR'),
}));

vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  COURSE_ANALYTICS_QUERY: 'COURSE_ANALYTICS_QUERY',
  AT_RISK_LEARNERS_QUERY: 'AT_RISK_LEARNERS_QUERY',
  RESOLVE_AT_RISK_FLAG_MUTATION: 'RESOLVE_AT_RISK_FLAG_MUTATION',
}));

vi.mock('./CourseAnalyticsPage.charts', () => ({
  AnalyticsCharts: vi.fn(() => <div data-testid="analytics-charts" />),
}));

vi.mock('@/components/AtRiskLearnersTable', () => ({
  AtRiskLearnersTable: vi.fn(() => <div data-testid="at-risk-table" />),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseAnalyticsPage } from './CourseAnalyticsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ANALYTICS = {
  courseId: 'course-123',
  enrollmentCount: 42,
  activeLearnersLast7Days: 18,
  completionRate: 65,
  avgQuizScore: 78,
  contentItemMetrics: [],
  dropOffFunnel: [],
};

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  analytics: typeof MOCK_ANALYTICS | null = MOCK_ANALYTICS,
  fetching = false,
  error?: { message: string }
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: {
        courseAnalytics: analytics,
        atRiskLearners: [],
      },
      fetching,
      error: error ?? undefined,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CourseAnalyticsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('shows "Access denied" for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('shows "Access denied" for null role', () => {
    vi.mocked(useAuthRole).mockReturnValue(null as never);
    renderPage();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('allows INSTRUCTOR to view the page', () => {
    renderPage();
    expect(screen.getByText('Course Analytics')).toBeInTheDocument();
  });

  it('allows ORG_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(screen.getByText('Course Analytics')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Course Analytics')).toBeInTheDocument();
  });

  it('shows loading indicator when fetching', () => {
    setupUrql(null, true);
    renderPage();
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('shows error state when analytics data is missing', () => {
    setupUrql(null, false, { message: 'Network error' });
    renderPage();
    expect(screen.getByText(/failed to load analytics/i)).toBeInTheDocument();
  });

  it('renders "Back to Course" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /back to course/i })
    ).toBeInTheDocument();
  });

  it('renders stat card labels: Enrolled, Active (7d), Completion Rate, Avg Quiz Score', () => {
    renderPage();
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Active (7d)')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Quiz Score')).toBeInTheDocument();
  });

  it('renders enrollment count value', () => {
    renderPage();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders completion rate as percentage', () => {
    renderPage();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders the AnalyticsCharts component', () => {
    renderPage();
    expect(screen.getByTestId('analytics-charts')).toBeInTheDocument();
  });

  it('renders the AtRiskLearnersTable component', () => {
    renderPage();
    expect(screen.getByTestId('at-risk-table')).toBeInTheDocument();
  });

  it('renders "At-Risk Learners" section heading', () => {
    renderPage();
    expect(screen.getByText('At-Risk Learners')).toBeInTheDocument();
  });
});
