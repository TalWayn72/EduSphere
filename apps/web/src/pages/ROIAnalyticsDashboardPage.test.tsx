/**
 * ROIAnalyticsDashboardPage tests — 10 scenarios covering rendering, KPIs,
 * ROI calculation, cost-per-user, export button, and loading skeleton.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (must be defined before component import) ────────────────────────
vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => 'ORG_ADMIN',
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

const mockData = {
  myTenantUsage: {
    tenantId: 'tenant-1',
    tenantName: 'Test University',
    plan: 'STARTER',
    yearlyActiveUsers: 342,
    seatLimit: 500,
    seatUtilizationPct: 68.4,
    monthlyActiveUsers: 120,
  },
};

// useQueryImpl is updated per-test via mockQueryResult
let mockQueryResult = { fetching: false, data: mockData, error: undefined };

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof import('urql')>('urql');
  return {
    ...actual,
    useQuery: vi.fn(() => [mockQueryResult, vi.fn()]),
  };
});

import { ROIAnalyticsDashboardPage } from './ROIAnalyticsDashboardPage';

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderPage() {
  return render(
    <MemoryRouter>
      <ROIAnalyticsDashboardPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('ROIAnalyticsDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the roi-dashboard-page container', () => {
    renderPage();
    expect(screen.getByTestId('roi-dashboard-page')).toBeInTheDocument();
  });

  it('renders the roi-summary-card', () => {
    renderPage();
    expect(screen.getByTestId('roi-summary-card')).toBeInTheDocument();
  });

  it('renders the kpi-grid', () => {
    renderPage();
    expect(screen.getByTestId('kpi-grid')).toBeInTheDocument();
  });

  it('shows YAU count (342) in kpi-yau card', () => {
    renderPage();
    const yauCard = screen.getByTestId('kpi-yau');
    expect(yauCard).toHaveTextContent('342');
  });

  it('shows MAU count (120) in kpi-mau card', () => {
    renderPage();
    const mauCard = screen.getByTestId('kpi-mau');
    expect(mauCard).toHaveTextContent('120');
  });

  it('shows utilization percentage in kpi-utilization card', () => {
    renderPage();
    const utilCard = screen.getByTestId('kpi-utilization');
    expect(utilCard).toHaveTextContent('68.4%');
  });

  it('shows plan name in kpi-plan card', () => {
    renderPage();
    const planCard = screen.getByTestId('kpi-plan');
    expect(planCard).toHaveTextContent('STARTER');
  });

  it('renders export PDF button', () => {
    renderPage();
    expect(screen.getByTestId('export-roi-pdf-btn')).toBeInTheDocument();
  });

  it('shows cost-per-user section', () => {
    renderPage();
    expect(screen.getByTestId('cost-per-user')).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching=true', () => {
    mockQueryResult = { fetching: true, data: undefined as typeof mockData | undefined, error: undefined };
    renderPage();
    const skeleton = document.querySelector('[aria-label="Loading ROI analytics"]');
    expect(skeleton).toBeInTheDocument();
    // reset for other tests
    mockQueryResult = { fetching: false, data: mockData, error: undefined };
  });
});
