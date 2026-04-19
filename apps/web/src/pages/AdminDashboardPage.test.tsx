import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';

// Mock AdminActivityFeed so the dashboard test stays isolated
vi.mock('@/components/AdminActivityFeed', () => ({
  AdminActivityFeed: ({ loading }: { loading?: boolean }) => (
    <div data-testid="admin-activity-feed-mock">
      {loading ? 'loading...' : 'Recent admin activity will appear here.'}
    </div>
  ),
}));

// Mock urql
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
}));

// Mock AdminLayout
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PageShell: ({ children }: any) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

vi.mock('@/components/PageHeader', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

// Mock AdminStatCards
vi.mock('@/components/admin/AdminStatCards', () => ({
  AdminStatCards: ({ overview }: { overview: Record<string, unknown> }) => (
    <div data-testid="admin-stat-cards">{JSON.stringify(overview)}</div>
  ),
}));

// Mock AdminQuickLinksGrid to keep tests isolated from icon imports
vi.mock('@/components/admin/AdminQuickLinksGrid', () => ({
  AdminQuickLinksGrid: () => (
    <div data-testid="admin-quick-links-grid">
      <a href="/admin/branding">Branding</a>
      <a href="/admin/users">User Management</a>
      <a href="/admin/compliance">Compliance Reports</a>
      <a href="/admin/gamification">Gamification Settings</a>
      <a href="/admin/security">Security Settings</a>
      <a href="/admin/audit">Audit Log</a>
      <a href="/admin/analytics">Analytics</a>
      <a href="/admin/billing">Billing</a>
    </div>
  ),
}));

// Mock useAuthRole — ORG_ADMIN to pass access guard
vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useQuery } from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

const MOCK_OVERVIEW = {
  totalUsers: 1200,
  activeUsersThisMonth: 340,
  totalCourses: 88,
  completionsThisMonth: 210,
  atRiskCount: 12,
  lastScimSync: '2026-02-20T10:00:00Z',
  lastComplianceReport: '2026-02-15T08:00:00Z',
  storageUsedMb: 4096,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminDashboardPage />
    </MemoryRouter>
  );

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);

    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    mockNavigate.mockClear();
  });

  it('renders admin layout with title "Admin Dashboard"', () => {
    renderPage();
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Admin Dashboard' })
    ).toBeInTheDocument();
  });

  it('shows loading spinner when fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    const { container } = renderPage();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Network error' } as Error,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(
      screen.getByText('Failed to load dashboard data')
    ).toBeInTheDocument();
  });

  it('shows stat cards when data loads', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminOverview: MOCK_OVERVIEW },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByTestId('admin-stat-cards')).toBeInTheDocument();
  });

  it('passes adminOverview data to AdminStatCards', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminOverview: MOCK_OVERVIEW },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    const cards = screen.getByTestId('admin-stat-cards');
    expect(cards.textContent).toContain('1200');
  });

  it('does not render stat cards while loading', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.queryByTestId('admin-stat-cards')).not.toBeInTheDocument();
  });

  it('renders the AdminQuickLinksGrid component', () => {
    renderPage();
    expect(screen.getByTestId('admin-quick-links-grid')).toBeInTheDocument();
  });

  it('quick links grid contains core navigation links', () => {
    const { container } = renderPage();
    const links = container.querySelectorAll('a[href]');
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/admin/branding');
    expect(hrefs).toContain('/admin/users');
    expect(hrefs).toContain('/admin/compliance');
    expect(hrefs).toContain('/admin/security');
    expect(hrefs).toContain('/admin/audit');
    expect(hrefs).toContain('/admin/analytics');
    expect(hrefs).toContain('/admin/billing');
  });

  it('shows "Admin Tools" section heading', () => {
    renderPage();
    expect(screen.getByText('Admin Tools')).toBeInTheDocument();
  });

  it('shows "Recent Activity" section', () => {
    renderPage();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('shows activity feed placeholder text', () => {
    renderPage();
    expect(
      screen.getByText('Recent admin activity will appear here.')
    ).toBeInTheDocument();
  });

  it('redirects to /dashboard if role is not admin (STUDENT)', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard if role is null', () => {
    vi.mocked(useAuthRole).mockReturnValue(null as unknown as string);
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('does not redirect when role is SUPER_ADMIN', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not show error when there is no error', () => {
    renderPage();
    expect(
      screen.queryByText(/Failed to load dashboard data/)
    ).not.toBeInTheDocument();
  });
});
