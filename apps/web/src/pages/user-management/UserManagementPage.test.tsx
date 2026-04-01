import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserManagementPage } from './UserManagementPage';
import type { AdminUser } from './user-management.types';

// ── mocks ─────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('urql', () => {
  const users = [
    {
      id: 'u1',
      email: 'alice@test.com',
      firstName: 'Alice',
      lastName: 'Wonder',
      role: 'INSTRUCTOR',
      tenantId: 't1',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'u2',
      email: 'bob@test.com',
      firstName: 'Bob',
      lastName: 'Builder',
      role: 'STUDENT',
      tenantId: 't1',
      createdAt: '2026-02-01T00:00:00Z',
    },
  ];
  return {
    useQuery: vi.fn().mockReturnValue([
      {
        data: { adminUsers: { users, total: 2 } },
        fetching: false,
      },
      vi.fn(),
    ]),
    useMutation: vi
      .fn()
      .mockReturnValue([{}, vi.fn().mockResolvedValue({ data: {} })]),
  };
});

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn().mockReturnValue('SUPER_ADMIN'),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockReturnValue({ tenantId: 'tenant-abc' }),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="role-filter">{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="role-trigger">{children}</button>
  ),
  SelectValue: () => <span>All Roles</span>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({
    children,
    ...props
  }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td {...props}>{children}</td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
}));

vi.mock('./UserTableRow', () => ({
  UserTableRow: ({ user }: { user: AdminUser }) => (
    <tr data-testid={`user-row-${user.id}`}>
      <td>{user.email}</td>
    </tr>
  ),
}));

vi.mock('../UserManagementPage.modals', () => ({
  InviteUserModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="invite-modal" /> : null,
  BulkImportModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="bulk-modal" /> : null,
}));

beforeEach(async () => {
  vi.clearAllMocks();
  const { useAuthRole } = await import('@/hooks/useAuthRole');
  (useAuthRole as ReturnType<typeof vi.fn>).mockReturnValue('SUPER_ADMIN');
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('UserManagementPage — access control', () => {
  it('redirects non-admin users', async () => {
    const { useAuthRole } = await import('@/hooks/useAuthRole');
    (useAuthRole as ReturnType<typeof vi.fn>).mockReturnValue('STUDENT');
    render(<UserManagementPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('renders for SUPER_ADMIN', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('User Management')).toBeTruthy();
  });
});

describe('UserManagementPage — layout', () => {
  it('renders page title', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('User Management')).toBeTruthy();
  });

  it('renders search input', () => {
    render(<UserManagementPage />);
    expect(
      screen.getByPlaceholderText('Search by name or email...')
    ).toBeTruthy();
  });

  it('renders Apply button', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('Apply')).toBeTruthy();
  });

  it('renders Invite User button', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('+ Invite User')).toBeTruthy();
  });

  it('renders Bulk Import button', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('Bulk Import')).toBeTruthy();
  });

  it('renders table headers', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Role')).toBeTruthy();
    expect(screen.getByText('Actions')).toBeTruthy();
  });

  it('renders user rows', () => {
    render(<UserManagementPage />);
    expect(screen.getByTestId('user-row-u1')).toBeTruthy();
    expect(screen.getByTestId('user-row-u2')).toBeTruthy();
  });

  it('shows total user count', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('Total: 2 users')).toBeTruthy();
  });
});

describe('UserManagementPage — modals', () => {
  it('does not show invite modal initially', () => {
    render(<UserManagementPage />);
    expect(screen.queryByTestId('invite-modal')).toBeNull();
  });

  it('opens invite modal on button click', () => {
    render(<UserManagementPage />);
    fireEvent.click(screen.getByText('+ Invite User'));
    expect(screen.getByTestId('invite-modal')).toBeTruthy();
  });

  it('does not show bulk modal initially', () => {
    render(<UserManagementPage />);
    expect(screen.queryByTestId('bulk-modal')).toBeNull();
  });

  it('opens bulk modal on button click', () => {
    render(<UserManagementPage />);
    fireEvent.click(screen.getByText('Bulk Import'));
    expect(screen.getByTestId('bulk-modal')).toBeTruthy();
  });
});

describe('UserManagementPage — pagination', () => {
  it('renders pagination controls', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('Previous')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('disables Previous on first page', () => {
    render(<UserManagementPage />);
    const prevBtn = screen.getByText('Previous');
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows page info', () => {
    render(<UserManagementPage />);
    expect(screen.getByText('1 / 1')).toBeTruthy();
  });
});
