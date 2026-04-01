import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminOverviewPage } from './AdminOverviewPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

const MOCK_METRICS = {
  totalUsers: 1250,
  activeCourses: 48,
  storageUsedMb: 5120,
  monthlyActiveUsers: 832,
};

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [
    {
      fetching: false,
      data: { tenantMetrics: MOCK_METRICS },
      error: undefined,
    },
    vi.fn(),
  ]),
}));

import * as urql from 'urql';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminOverviewPage />
    </MemoryRouter>
  );
}

describe('AdminOverviewPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        data: { tenantMetrics: MOCK_METRICS },
        error: undefined,
      },
      vi.fn(),
    ] as never);
  });

  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('admin-overview-page')).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, data: undefined, error: undefined },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('overview-skeleton')).toBeInTheDocument();
  });

  it('displays correct data-testid attributes for metric cards', () => {
    renderPage();
    expect(screen.getByTestId('metric-total-users')).toBeInTheDocument();
    expect(screen.getByTestId('metric-active-courses')).toBeInTheDocument();
    expect(screen.getByTestId('metric-storage-used')).toBeInTheDocument();
    expect(
      screen.getByTestId('metric-monthly-active-users')
    ).toBeInTheDocument();
  });

  it('displays BETA badge', () => {
    renderPage();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });

  it('shows error state when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: undefined, error: new Error('fail') },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByText(/Failed to load metrics/)).toBeInTheDocument();
  });
});
