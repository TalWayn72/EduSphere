import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuditLogPage } from './AuditLogPage';

// Mock urql
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
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
  AdminLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="admin-layout">
      <h1>{title}</h1>
      {children}
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

// Mock audit queries module
vi.mock('@/lib/graphql/audit.queries', () => ({
  ADMIN_AUDIT_LOG_QUERY: 'mock-audit-query',
}));

import { useQuery } from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

const MOCK_ENTRIES = [
  {
    id: 'e1',
    action: 'USER_CREATED',
    userId: 'u-abc',
    resourceType: 'User',
    resourceId: 'u-abc',
    status: 'SUCCESS',
    ipAddress: '10.0.0.1',
    createdAt: '2026-02-20T09:00:00Z',
  },
  {
    id: 'e2',
    action: 'COURSE_DELETED',
    userId: 'u-def',
    resourceType: 'Course',
    resourceId: 'c-001',
    status: 'FAILURE',
    ipAddress: '10.0.0.2',
    createdAt: '2026-02-20T10:30:00Z',
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuditLogPage />
    </MemoryRouter>
  );

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);

    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    mockNavigate.mockClear();
  });

  it('renders with "Audit Log" title in admin layout', () => {
    renderPage();
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Audit Log' })
    ).toBeInTheDocument();
  });

  it('shows loading state when fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Service unavailable' } as Error,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('Failed to load audit log.')).toBeInTheDocument();
  });

  it('shows empty state when no audit entries found', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: [], total: 0 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('No audit entries found.')).toBeInTheDocument();
  });

  it('renders filter inputs (action, since, until) and Clear button', () => {
    renderPage();
    expect(
      screen.getByPlaceholderText('Filter by action...')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Since date')).toBeInTheDocument();
    expect(screen.getByLabelText('Until date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('shows table with entries when data is available', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 2 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('USER_CREATED')).toBeInTheDocument();
    expect(screen.getByText('COURSE_DELETED')).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 2 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('User ID')).toBeInTheDocument();
    expect(screen.getByText('Resource')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('IP Address')).toBeInTheDocument();
  });

  it('renders entry userId and ip in table rows', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 2 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('u-abc')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
  });

  it('does not show pagination when total <= 50', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 2 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(
      screen.queryByRole('button', { name: /previous/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next/i })
    ).not.toBeInTheDocument();
  });

  it('shows pagination buttons when total > 50', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 120 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(
      screen.getByRole('button', { name: /previous/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('Previous button is disabled on the first page', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 120 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('Next button is disabled on the last page', () => {
    // total=51 → totalPages=2. Clicking Next once moves to page 1 (last page).
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 51 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    // Navigate to last page
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('page info text shows total entries and page count', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminAuditLog: { entries: MOCK_ENTRIES, total: 120 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(
      screen.getByText('120 total entries — page 1 of 3')
    ).toBeInTheDocument();
  });

  it('typing in action filter does not throw and input updates', () => {
    renderPage();
    const input = screen.getByPlaceholderText('Filter by action...');
    fireEvent.change(input, { target: { value: 'USER_CREATED' } });
    expect(input).toHaveValue('USER_CREATED');
  });

  it('Clear button resets action filter input value', () => {
    renderPage();
    const input = screen.getByPlaceholderText('Filter by action...');
    fireEvent.change(input, { target: { value: 'SOME_ACTION' } });
    expect(input).toHaveValue('SOME_ACTION');
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(input).toHaveValue('');
  });

  it('Clear button resets since and until date inputs', () => {
    renderPage();
    const sinceInput = screen.getByLabelText('Since date');
    const untilInput = screen.getByLabelText('Until date');
    fireEvent.change(sinceInput, { target: { value: '2026-01-01' } });
    fireEvent.change(untilInput, { target: { value: '2026-02-01' } });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(sinceInput).toHaveValue('');
    expect(untilInput).toHaveValue('');
  });

  it('redirects non-admin users to /dashboard', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('does not redirect ORG_ADMIN users', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not redirect SUPER_ADMIN users', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
