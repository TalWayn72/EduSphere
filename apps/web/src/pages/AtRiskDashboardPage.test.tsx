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
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useMutation: vi.fn(),
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
  AtRiskLearnersTable: vi.fn(({ learners, onResolve }: { learners: { learnerId: string; courseId: string }[]; onResolve: (l: string, c: string) => void }) => (
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
  )),
}));

vi.mock('./AtRiskDashboardPage.config', () => ({
  RiskThresholdConfig: vi.fn(() => <div data-testid="risk-threshold-config" />),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { AtRiskDashboardPage } from './AtRiskDashboardPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql() {
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
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

  it('shows correct Total At-Risk count (6 mock learners)', () => {
    renderPage();
    // 6 mock learners in MOCK_LEARNERS
    expect(screen.getByTestId('row-count').textContent).toBe('6');
  });

  it('renders the Export CSV button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /export csv/i })
    ).toBeInTheDocument();
  });

  it('renders the AtRiskLearnersTable component', () => {
    renderPage();
    expect(screen.getByTestId('at-risk-table')).toBeInTheDocument();
  });

  it('renders the RiskThresholdConfig component', () => {
    renderPage();
    expect(
      screen.getByTestId('risk-threshold-config')
    ).toBeInTheDocument();
  });

  it('renders filter select trigger', () => {
    renderPage();
    // The Select trigger placeholder or current value
    expect(screen.getByText('All Risk Levels')).toBeInTheDocument();
  });
});
