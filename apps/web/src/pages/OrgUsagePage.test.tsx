/**
 * OrgUsagePage — unit tests with mocked urql
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
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

// Mock AdminLayout to avoid deep rendering
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

import { useQuery } from 'urql';
import { OrgUsagePage } from './OrgUsagePage';

const MOCK_USAGE = {
  tenantId: 'tenant-1',
  tenantName: 'Acme Corp',
  plan: 'STARTER',
  yearlyActiveUsers: 342,
  monthlyActiveUsers: 120,
  seatLimit: 500,
  seatUtilizationPct: 68,
  overageUsers: 0,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OrgUsagePage />
    </MemoryRouter>
  );
}

describe('OrgUsagePage', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      { data: { myTenantUsage: MOCK_USAGE }, fetching: false, error: undefined },
      vi.fn(),
      vi.fn(),
    ] as ReturnType<typeof useQuery>);
  });

  it('renders data-testid="org-usage-page"', () => {
    renderPage();
    expect(screen.getByTestId('org-usage-page')).toBeInTheDocument();
  });

  it('renders UsageMeter (data-testid="usage-meter")', () => {
    renderPage();
    expect(screen.getByTestId('usage-meter')).toBeInTheDocument();
  });

  it('shows YAU count', () => {
    renderPage();
    expect(screen.getByTestId('usage-meter-current')).toHaveTextContent('342');
  });

  it('shows seat limit in stats row', () => {
    renderPage();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('does NOT show overage callout when overageUsers=0', () => {
    renderPage();
    expect(screen.queryByTestId('overage-callout')).not.toBeInTheDocument();
  });

  it('shows overage callout when overageUsers > 0', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: {
          myTenantUsage: { ...MOCK_USAGE, yearlyActiveUsers: 550, overageUsers: 50 },
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
      vi.fn(),
    ] as ReturnType<typeof useQuery>);

    renderPage();
    const callout = screen.getByTestId('overage-callout');
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('50 users over your 500-seat limit');
  });

  it('shows loading skeletons while fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
      vi.fn(),
    ] as ReturnType<typeof useQuery>);

    renderPage();
    // Skeletons present, no usage meter
    expect(screen.queryByTestId('usage-meter')).not.toBeInTheDocument();
  });

  it('shows error state if query fails', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Network error', graphQLErrors: [], networkError: undefined, response: undefined },
      },
      vi.fn(),
      vi.fn(),
    ] as ReturnType<typeof useQuery>);

    renderPage();
    expect(screen.getByText(/Failed to load usage data/i)).toBeInTheDocument();
  });
});
