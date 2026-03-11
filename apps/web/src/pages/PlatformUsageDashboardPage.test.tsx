/**
 * PlatformUsageDashboardPage — unit tests with mocked urql
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock urql
vi.mock('urql', () => ({
  useQuery: vi.fn(),
}));

// Mock auth
vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'SUPER_ADMIN'),
}));

// Mock AdminLayout
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

import { useQuery } from 'urql';
import { PlatformUsageDashboardPage } from './PlatformUsageDashboardPage';

const MOCK_TENANTS = [
  {
    tenantId: 'tenant-1',
    tenantName: 'Acme Corp',
    plan: 'STARTER',
    yearlyActiveUsers: 200,
    seatLimit: 500,
    seatUtilizationPct: 40,
    overageUsers: 0,
    monthlyActiveUsers: 80,
  },
  {
    tenantId: 'tenant-2',
    tenantName: 'Beta University',
    plan: 'UNIVERSITY',
    yearlyActiveUsers: 850,
    seatLimit: 1000,
    seatUtilizationPct: 85,
    overageUsers: 0,
    monthlyActiveUsers: 300,
  },
  {
    tenantId: 'tenant-3',
    tenantName: 'Gamma Inc',
    plan: 'GROWTH',
    yearlyActiveUsers: 310,
    seatLimit: 300,
    seatUtilizationPct: 103,
    overageUsers: 10,
    monthlyActiveUsers: 100,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PlatformUsageDashboardPage />
    </MemoryRouter>
  );
}

describe('PlatformUsageDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      { data: { platformUsageOverview: MOCK_TENANTS }, fetching: false, error: undefined },
      vi.fn(),
      vi.fn(),
    ] as ReturnType<typeof useQuery>);
  });

  it('renders data-testid="platform-usage-page"', () => {
    renderPage();
    expect(screen.getByTestId('platform-usage-page')).toBeInTheDocument();
  });

  it('renders the table with data-testid="platform-usage-table"', () => {
    renderPage();
    expect(screen.getByTestId('platform-usage-table')).toBeInTheDocument();
  });

  it('shows all 3 tenants', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta University')).toBeInTheDocument();
    expect(screen.getByText('Gamma Inc')).toBeInTheDocument();
  });

  it('shows green status for low utilization tenant', () => {
    renderPage();
    // Acme Corp has 40% utilization -> 🟢
    const rows = screen.getAllByRole('row');
    // Find Gamma row (103%) - sorted first by desc utilization
    const gammaRow = rows.find((r) => r.textContent?.includes('Gamma Inc'));
    expect(gammaRow).toBeDefined();

    // Find Acme row (40%) - sorted last
    const acmeRow = rows.find((r) => r.textContent?.includes('Acme Corp'));
    expect(acmeRow?.textContent).toContain('🟢');
  });

  it('shows red status for >= 100% utilization', () => {
    renderPage();
    const rows = screen.getAllByRole('row');
    const gammaRow = rows.find((r) => r.textContent?.includes('Gamma Inc'));
    expect(gammaRow?.textContent).toContain('🔴');
  });

  it('shows yellow status for 80-99% utilization', () => {
    renderPage();
    const rows = screen.getAllByRole('row');
    const betaRow = rows.find((r) => r.textContent?.includes('Beta University'));
    expect(betaRow?.textContent).toContain('🟡');
  });

  it('renders export CSV button', () => {
    renderPage();
    expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
      vi.fn(),
    ] as ReturnType<typeof useQuery>);

    renderPage();
    expect(screen.queryByTestId('platform-usage-table')).not.toBeInTheDocument();
  });

  it('sorts by utilization % descending', () => {
    renderPage();
    const rows = screen.getAllByRole('row');
    // Skip header row (index 0)
    const dataRows = rows.slice(1).filter((r) => r.textContent?.trim());
    // First data row should be Gamma (103%), second Beta (85%), third Acme (40%)
    expect(dataRows[0]?.textContent).toContain('Gamma Inc');
    expect(dataRows[1]?.textContent).toContain('Beta University');
    expect(dataRows[2]?.textContent).toContain('Acme Corp');
  });
});
