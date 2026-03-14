import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartnerDashboardPage } from './PartnerDashboardPage';

const MOCK_DASHBOARD = {
  status: 'ACTIVE',
  apiKey: 'esph_abc123def456ghi789',
  revenueByMonth: [
    { month: 'January 2026', grossRevenue: 3000, platformCut: 900, payout: 2100, status: 'PAID' },
    { month: 'February 2026', grossRevenue: 4000, platformCut: 1200, payout: 2800, status: 'PENDING' },
  ],
};

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [
      { fetching: false, data: { myPartnerDashboard: MOCK_DASHBOARD }, error: undefined },
    ]),
    useMutation: vi.fn(() => [{ fetching: false, data: null }, vi.fn()]),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

vi.mock('@/hooks/useAuthRole', () => ({ useAuthRole: vi.fn(() => 'ORG_ADMIN') }));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="admin-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/components/partners/PartnerTierBadge', () => ({
  PartnerTierBadge: ({ tier }: { tier: string }) => <span data-testid="tier-badge">{tier}</span>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PartnerDashboardPage />
    </MemoryRouter>
  );
}

describe('PartnerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard page with data-testid', () => {
    renderPage();
    expect(screen.getByTestId('partner-dashboard-page')).toBeInTheDocument();
  });

  it('shows partner status badge', () => {
    renderPage();
    expect(screen.getByTestId('partner-status-badge')).toBeInTheDocument();
  });

  it('shows revenue table', () => {
    renderPage();
    expect(screen.getByTestId('revenue-table')).toBeInTheDocument();
  });

  it('shows API key section', () => {
    renderPage();
    expect(screen.getByTestId('api-key-section')).toBeInTheDocument();
  });

  it('shows masked API key', () => {
    renderPage();
    expect(screen.getByTestId('api-key-display').textContent).toMatch(/esph_abc/);
  });

  it('shows platform cut column header', () => {
    renderPage();
    expect(screen.getByText(/Platform Cut \(30%\)/i)).toBeInTheDocument();
  });

  it('shows payout column header', () => {
    renderPage();
    expect(screen.getByText(/Your Payout \(70%\)/i)).toBeInTheDocument();
  });

  it('shows regenerate button', () => {
    renderPage();
    expect(screen.getByTestId('regenerate-key-btn')).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      { fetching: true, data: null, error: undefined },
    ] as never);
    renderPage();
    expect(screen.getByTestId('partner-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no partner data', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      { fetching: false, data: { myPartnerDashboard: null }, error: undefined },
    ] as never);
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
