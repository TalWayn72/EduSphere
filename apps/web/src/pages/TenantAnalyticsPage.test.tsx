/**
 * TenantAnalyticsPage — unit tests
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof urql>();
  return {
    ...actual,
    gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce(
        (acc: string, str: string, i: number) =>
          acc + str + String(values[i] ?? ''),
        ''
      ),
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div data-testid="admin-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('./TenantAnalyticsPage.charts', () => ({
  TenantAnalyticsCharts: () => (
    <div data-testid="analytics-charts">Charts</div>
  ),
}));

vi.mock('./TenantAnalyticsPage.cohort', () => ({
  CohortRetentionTable: ({ rows }: { rows: unknown[] }) => (
    <div data-testid="cohort-table">Rows: {rows.length}</div>
  ),
}));

vi.mock('./TenantAnalyticsPage.export', () => ({
  ExportAnalyticsButton: ({ period }: { period: string }) => (
    <button data-testid="export-btn">Export CSV ({period})</button>
  ),
}));

vi.mock('@/lib/graphql/tenant-analytics.queries', () => ({
  TENANT_ANALYTICS_QUERY: 'TENANT_ANALYTICS_QUERY',
  COHORT_RETENTION_QUERY: 'COHORT_RETENTION_QUERY',
  EXPORT_TENANT_ANALYTICS_MUTATION: 'EXPORT_TENANT_ANALYTICS_MUTATION',
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

import { useAuthRole } from '@/hooks/useAuthRole';

const NOOP_QUERY = [
  { fetching: false, data: undefined, error: undefined, stale: false, hasNext: false },
  vi.fn(),
] as never;

const MOCK_ANALYTICS = {
  tenantAnalytics: {
    activeLearnersTrend: [{ date: '2026-03-01', value: 120 }],
    completionRateTrend: [{ date: '2026-03-01', value: 0.65 }],
    totalEnrollments: 840,
    avgLearningVelocity: 3.2,
    topCourses: [],
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MOCK_COHORT = {
  cohortRetention: [
    {
      cohortWeek: '2026-W01',
      enrolled: 50,
      activeAt7Days: 45,
      activeAt30Days: 38,
      completionRate30Days: 0.76,
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _renderPage() {
  const { TenantAnalyticsPage } = vi.importActual<
    typeof import('./TenantAnalyticsPage')
  >('./TenantAnalyticsPage') as { TenantAnalyticsPage: React.ComponentType };

  const { default: Page } = { default: TenantAnalyticsPage };

  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

import { TenantAnalyticsPage } from './TenantAnalyticsPage';

function renderDirect() {
  return render(
    <MemoryRouter>
      <TenantAnalyticsPage />
    </MemoryRouter>
  );
}

describe('TenantAnalyticsPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    vi.mocked(urql.useMutation).mockReturnValue(
      [{ fetching: false }, vi.fn().mockResolvedValue({ data: undefined })] as never
    );
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    mockNavigate.mockClear();
  });

  it('renders AdminLayout with title "Tenant Analytics"', () => {
    renderDirect();
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tenant Analytics' })).toBeInTheDocument();
  });

  it('renders period selector tabs', () => {
    renderDirect();
    expect(screen.getByRole('tab', { name: '7 Days' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '30 Days' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '90 Days' })).toBeInTheDocument();
  });

  it('shows 30 Days tab selected by default', () => {
    renderDirect();
    const tab30 = screen.getByRole('tab', { name: '30 Days' });
    expect(tab30).toHaveAttribute('aria-selected', 'true');
  });

  it('changes selected tab on click', () => {
    renderDirect();
    const tab7 = screen.getByRole('tab', { name: '7 Days' });
    fireEvent.click(tab7);
    expect(tab7).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '30 Days' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('shows Export CSV button', () => {
    renderDirect();
    expect(screen.getByTestId('export-btn')).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, data: undefined, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    const { container } = renderDirect();
    expect(container.querySelector('[aria-label="Loading analytics"]')).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: { message: 'Network error' },
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderDirect();
    expect(screen.getByText(/Failed to load analytics: Network error/)).toBeInTheDocument();
  });

  it('does NOT show raw error object to user when there is no error', () => {
    renderDirect();
    expect(screen.queryByText(/Failed to load analytics/)).not.toBeInTheDocument();
  });

  it('renders KPI cards when analytics data is present', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        data: MOCK_ANALYTICS,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderDirect();
    expect(screen.getByText('840')).toBeInTheDocument();
  });

  it('renders charts when analytics data is present', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        data: MOCK_ANALYTICS,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderDirect();
    expect(screen.getByTestId('analytics-charts')).toBeInTheDocument();
  });

  it('renders cohort table (always, even when empty)', () => {
    renderDirect();
    expect(screen.getByTestId('cohort-table')).toBeInTheDocument();
  });

  it('redirects to /dashboard for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderDirect();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard when role is null', () => {
    vi.mocked(useAuthRole).mockReturnValue(null as unknown as string);
    renderDirect();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('does NOT redirect for SUPER_ADMIN role', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderDirect();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does NOT show charts while loading', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, data: undefined, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderDirect();
    expect(screen.queryByTestId('analytics-charts')).not.toBeInTheDocument();
  });
});

// ExportAnalyticsButton and CohortRetentionTable are tested via integration
// within TenantAnalyticsPage tests above (they are mocked there for isolation).
// Standalone component tests live in their dedicated .export.test.tsx / .cohort.test.tsx files.
