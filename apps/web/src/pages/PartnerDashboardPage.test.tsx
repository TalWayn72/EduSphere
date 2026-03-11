import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartnerDashboardPage } from './PartnerDashboardPage';

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [{ fetching: false, data: null, error: undefined }]),
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
    expect(screen.getByText(/esph_•••••••••••••••••/)).toBeInTheDocument();
  });

  it('shows platform cut column header', () => {
    renderPage();
    expect(screen.getByText(/Platform Cut \(30%\)/i)).toBeInTheDocument();
  });

  it('shows payout column header', () => {
    renderPage();
    expect(screen.getByText(/Your Payout \(70%\)/i)).toBeInTheDocument();
  });

  it('shows loading state when fetching', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([{ fetching: true, data: null, error: undefined, stale: false, operation: undefined as never }]);
    renderPage();
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});
