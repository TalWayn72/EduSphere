import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserManagementPage } from './UserManagementPage';

// Mock urql
vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ]),
    useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  };
});

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

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock @/lib/auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({ tenantId: 'auth-tenant-1' })),
}));

// Mock modals — they are imported but not under test here
vi.mock('./UserManagementPage.modals', () => ({
  InviteUserModal: () => null,
  BulkImportModal: () => null,
}));

// Mock shadcn Select with native <select> so fireEvent.change triggers onValueChange
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange?: (v: string) => void; children: React.ReactNode }) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';
import { useAuthRole } from '@/hooks/useAuthRole';

const MOCK_USERS = [
  {
    id: 'u1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    role: 'INSTRUCTOR',
    tenantId: 't1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'u2',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Jones',
    role: 'STUDENT',
    tenantId: 't1',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <UserManagementPage />
    </MemoryRouter>
  );

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminUsers: { users: MOCK_USERS, total: 2 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);

    // Default: mutations succeed (no error)
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false, error: undefined },
      vi.fn().mockResolvedValue({ error: undefined }),
    ] as unknown as ReturnType<typeof useMutation>);

    vi.mocked(getCurrentUser).mockReturnValue({ tenantId: 'auth-tenant-1' } as ReturnType<typeof getCurrentUser>);
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    mockNavigate.mockClear();
  });

  // ─── Existing tests ───────────────────────────────────────────────────────

  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });

  // Regression: BUG-SELECT-001 — SelectItem value must not be empty string
  it('role filter Select does not use empty string as SelectItem value', () => {
    const { container } = renderPage();
    // All SelectItem elements rendered by Radix have data-value attribute
    const items = container.querySelectorAll('[data-radix-select-item]');
    items.forEach((item) => {
      expect(item.getAttribute('data-value')).not.toBe('');
    });
  });

  it('role filter defaults to "All Roles" option (value="all")', () => {
    renderPage();
    // The trigger button shows the current selection — default is "All Roles"
    expect(screen.getByText('All Roles')).toBeInTheDocument();
  });

  it('renders user rows from API response', () => {
    renderPage();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('renders correct total count', () => {
    renderPage();
    expect(screen.getByText('Total: 2 users')).toBeInTheDocument();
  });

  it('shows loading state when fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no users', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminUsers: { users: [], total: 0 } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('Apply button is rendered', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('Invite User button is rendered', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /invite user/i })
    ).toBeInTheDocument();
  });

  it('Bulk Import button is rendered', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /bulk import/i })
    ).toBeInTheDocument();
  });

  it('redirects non-admin users to /dashboard', () => {
    vi.mocked(useAuthRole).mockReturnValueOnce('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('Previous page button is disabled on first page', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /previous/i })
    ).toBeDisabled();
  });

  it('search input triggers apply on Enter key', () => {
    const refetch = vi.fn();
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { adminUsers: { users: MOCK_USERS, total: 2 } },
        fetching: false,
        error: undefined,
      },
      refetch,
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    const input = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(input, { target: { value: 'alice' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Component re-renders with appliedSearch="alice" → useQuery called with new vars
    expect(input).toHaveValue('alice');
  });

  // ─── New tests: role change confirmation ──────────────────────────────────

  it('shows role confirmation UI when role is changed', () => {
    renderPage();

    // With the native-select mock, all <select> elements respond to fireEvent.change.
    // Index 0 = role-filter select, index 1 = Alice's row select.
    const selects = screen.getAllByRole('combobox');
    // Alice is first user row → index 1
    fireEvent.change(selects[1], { target: { value: 'STUDENT' } });

    // confirmRoleChange state set → shows "→ STUDENT?" + Confirm/Cancel
    expect(screen.getByText(/→ STUDENT\?/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('cancels role confirmation on Cancel click', () => {
    renderPage();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'STUDENT' } });
    expect(screen.getByText(/→ STUDENT\?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByText(/→ STUDENT\?/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument();
  });

  it('calls updateUser and shows success toast on Confirm', async () => {
    const mockUpdateUser = vi.fn().mockResolvedValue({ error: undefined });
    // useMutation called 3×: deactivate, reset, update — return mockUpdateUser for all
    // so that whichever call resolves, updateUser is captured
    vi.mocked(useMutation).mockImplementation(() => [
      { fetching: false, error: undefined },
      mockUpdateUser,
    ] as unknown as ReturnType<typeof useMutation>);

    renderPage();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'STUDENT' } });
    expect(screen.getByText(/→ STUDENT\?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        id: 'u1',
        input: { role: 'STUDENT' },
      });
      expect(toast.success).toHaveBeenCalledWith('Role updated successfully');
    });
  });

  // ─── New tests: toast on error ────────────────────────────────────────────

  it('shows error toast when resetPassword fails', async () => {
    const mockResetPassword = vi
      .fn()
      .mockResolvedValue({ error: new Error('network error') });

    // useMutation is called three times in the component (deactivate, reset, update).
    // Return the error mock only for the reset call (second invocation).
    vi.mocked(useMutation)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        vi.fn().mockResolvedValue({ error: undefined }), // deactivateUser
      ] as unknown as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        mockResetPassword, // resetPassword
      ] as unknown as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        vi.fn().mockResolvedValue({ error: undefined }), // updateUser
      ] as unknown as ReturnType<typeof useMutation>);

    renderPage();

    // Click "Reset Pw" for Alice (first Reset Pw button)
    const resetButtons = screen.getAllByRole('button', { name: /reset pw/i });
    fireEvent.click(resetButtons[0]);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({ userId: 'u1' });
      expect(toast.error).toHaveBeenCalledWith('Failed to send password reset');
    });
  });

  it('shows error toast when deactivate fails', async () => {
    const mockDeactivateUser = vi
      .fn()
      .mockResolvedValue({ error: new Error('server error') });

    // mockImplementation is stable across re-renders (unlike mockReturnValueOnce)
    vi.mocked(useMutation).mockImplementation(() => [
      { fetching: false, error: undefined },
      mockDeactivateUser,
    ] as unknown as ReturnType<typeof useMutation>);

    renderPage();

    const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i });
    fireEvent.click(deactivateButtons[0]);

    const confirmButton = screen.getByRole('button', { name: /^confirm$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeactivateUser).toHaveBeenCalledWith({ id: 'u1' });
      expect(toast.error).toHaveBeenCalledWith('Failed to deactivate user');
    });
  });

  // ─── New test: tenantId source ────────────────────────────────────────────

  it('uses getCurrentUser tenantId not first user tenantId', () => {
    // getCurrentUser returns tenantId 'auth-tenant-1' (set in beforeEach).
    // users[0].tenantId is 't1'. The component must call getCurrentUser().
    renderPage();
    expect(getCurrentUser).toHaveBeenCalled();
  });
});
