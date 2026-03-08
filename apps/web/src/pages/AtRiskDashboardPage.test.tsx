import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AdminLayout: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/components/AtRiskLearnersTable', () => ({
  AtRiskLearnersTable: vi.fn(
    ({
      learners,
      onResolve,
    }: {
      learners: { learnerId: string; courseId: string }[];
      onResolve: (l: string, c: string) => void;
    }) => (
      <div data-testid="at-risk-table">
        {learners.map((l) => (
          <button
            key={l.learnerId + l.courseId}
            onClick={() => onResolve(l.learnerId, l.courseId)}
          >
            Resolve {l.learnerId}
          </button>
        ))}
        <span data-testid="row-count">{learners.length}</span>
      </div>
    )
  ),
}));

vi.mock('./AtRiskDashboardPage.config', () => ({
  RiskThresholdConfig: vi.fn(() => <div data-testid="risk-threshold-config" />),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/graphql/at-risk.queries', () => ({
  LIST_AT_RISK_LEARNERS_QUERY: 'LIST_AT_RISK_LEARNERS_QUERY',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { AtRiskDashboardPage } from './AtRiskDashboardPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

const REAL_LEARNERS = [
  {
    userId: '00000000-0000-0000-0000-000000000001',
    displayName: 'Alice Smith',
    courseId: '00000000-0000-0000-0000-000000000010',
    courseTitle: 'Intro to AI',
    daysSinceActive: 14,
    progressPct: 12,
  },
  {
    userId: '00000000-0000-0000-0000-000000000002',
    displayName: 'Bob Jones',
    courseId: '00000000-0000-0000-0000-000000000011',
    courseTitle: 'Advanced Math',
    daysSinceActive: 10,
    progressPct: 22,
  },
];

function setupUrql(overrides: {
  fetching?: boolean;
  error?: { message: string } | null;
  data?: { listAtRiskLearners: typeof REAL_LEARNERS } | null;
} = {}) {
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
  ] as never);
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      fetching: overrides.fetching ?? false,
      error: overrides.error ?? null,
      data: overrides.data !== undefined
        ? overrides.data
        : { listAtRiskLearners: [] },
      stale: false,
    },
    vi.fn(),
    vi.fn(),
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AtRiskDashboardPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AtRiskDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders "At-Risk Learners" heading via AdminLayout', () => {
    renderPage();
    expect(screen.getByText('At-Risk Learners')).toBeInTheDocument();
  });

  it('redirects to /dashboard for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('allows ORG_ADMIN to view the page', () => {
    renderPage();
    expect(screen.getByText('At-Risk Learners')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('At-Risk Learners')).toBeInTheDocument();
  });

  it('renders stat cards: Total At-Risk, High Risk, Avg Days Inactive, Courses Affected', () => {
    renderPage();
    expect(screen.getByText('Total At-Risk')).toBeInTheDocument();
    expect(screen.getByText('High Risk (>70%)')).toBeInTheDocument();
    expect(screen.getByText('Avg Days Inactive')).toBeInTheDocument();
    expect(screen.getByText('Courses Affected')).toBeInTheDocument();
  });

  it('renders the Export CSV button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /export csv/i })
    ).toBeInTheDocument();
  });

  it('renders filter select trigger', () => {
    renderPage();
    expect(screen.getByText('All Risk Levels')).toBeInTheDocument();
  });

  it('renders the RiskThresholdConfig component', () => {
    renderPage();
    expect(screen.getByTestId('risk-threshold-config')).toBeInTheDocument();
  });

  // ── Real data tests ──────────────────────────────────────────────────────────

  it('REGRESSION: does NOT render mock learner IDs (usr-aaa1, usr-bbb2)', () => {
    setupUrql({ data: { listAtRiskLearners: [] } });
    renderPage();
    expect(document.body.textContent).not.toContain('usr-aaa1');
    expect(document.body.textContent).not.toContain('usr-bbb2');
    expect(document.body.textContent).not.toContain('usr-ccc3');
    expect(document.body.textContent).not.toContain('usr-ddd4');
    expect(document.body.textContent).not.toContain('usr-eee5');
    expect(document.body.textContent).not.toContain('usr-fff6');
  });

  it('REGRESSION: does NOT render mock course IDs (crs-001, crs-002)', () => {
    setupUrql({ data: { listAtRiskLearners: [] } });
    renderPage();
    expect(document.body.textContent).not.toContain('crs-001');
    expect(document.body.textContent).not.toContain('crs-002');
  });

  it('shows empty state when listAtRiskLearners returns empty array', () => {
    setupUrql({ data: { listAtRiskLearners: [] } });
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no at-risk learners detected/i)).toBeInTheDocument();
  });

  it('does NOT show empty state when learners are present', () => {
    setupUrql({ data: { listAtRiskLearners: REAL_LEARNERS } });
    renderPage();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders real learner names from API data', () => {
    setupUrql({ data: { listAtRiskLearners: REAL_LEARNERS } });
    renderPage();
    // The AtRiskLearnersTable mock renders "Resolve {learnerId}" buttons
    expect(screen.getByTestId('row-count').textContent).toBe('2');
  });

  it('shows error banner when query fails', () => {
    setupUrql({ error: { message: 'Network error' } });
    renderPage();
    expect(
      screen.getByRole('alert')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/unable to load at-risk learners/i)
    ).toBeInTheDocument();
  });

  it('does NOT render raw GraphQL error message to user', () => {
    setupUrql({ error: { message: '[GraphQL] Internal server error' } });
    renderPage();
    expect(document.body.textContent).not.toContain('[GraphQL]');
    expect(document.body.textContent).not.toContain('Internal server error');
  });

  it('shows loading indicators (…) in stat cards while fetching', () => {
    setupUrql({ fetching: true });
    renderPage();
    // All 4 stat card values show "…" during load
    const ellipses = screen.getAllByText('…');
    expect(ellipses.length).toBeGreaterThanOrEqual(4);
  });

  it('calls useQuery with LIST_AT_RISK_LEARNERS_QUERY and threshold 30', () => {
    renderPage();
    expect(urql.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'LIST_AT_RISK_LEARNERS_QUERY',
        variables: { threshold: 30 },
      })
    );
  });
});
