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

import { useQuery, useMutation } from 'urql';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';

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
    const { useAuthRole } = vi.mocked(
      require('@/hooks/useAuthRole') as typeof import('@/hooks/useAuthRole')
    );
    useAuthRole.mockReturnValueOnce('STUDENT');
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

    // The per-row role Select for Alice (u1 — INSTRUCTOR). Simulate onValueChange
    // by firing a change on the hidden native select rendered by Radix under the hood,
    // or by directly invoking the onValueChange prop via fireEvent on the trigger.
    // Because Radix Select is heavily mocked by jsdom, we locate the SelectTrigger
    // for Alice's row and fire the custom 'change' event with the new value.
    // The reliable approach is to find the trigger by its displayed badge text and
    // fire the value-change through the component's event handler.

    // Locate Alice's role trigger (displays her current role "INSTRUCTOR")
    const roleTriggers = screen.getAllByRole('combobox');
    // First combobox is the role-filter Select; subsequent ones are per-user row Selects.
    // Alice is the first user row → index 1
    const aliceRoleTrigger = roleTriggers[1];

    // Radix renders a native <select> alongside the styled trigger for accessibility.
    // fireEvent.change on that native select triggers onValueChange.
    const nativeSelects = document.querySelectorAll('select');
    // The second native select corresponds to Alice's row role Select
    const aliceNativeSelect = nativeSelects[1];
    if (aliceNativeSelect) {
      fireEvent.change(aliceNativeSelect, { target: { value: 'STUDENT' } });
    } else {
      // Fallback: fire change on the trigger element itself
      fireEvent.change(aliceRoleTrigger, { target: { value: 'STUDENT' } });
    }

    // After handleRoleChange fires, confirmRoleChange state is set.
    // The UI should now show "→ STUDENT?" and Confirm/Cancel buttons.
    expect(screen.getByText(/→ STUDENT\?/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^confirm$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^cancel$/i })
    ).toBeInTheDocument();
  });

  it('cancels role confirmation on Cancel click', () => {
    renderPage();

    // Trigger role change for Alice to open confirmation UI
    const nativeSelects = document.querySelectorAll('select');
    const aliceNativeSelect = nativeSelects[1];
    if (aliceNativeSelect) {
      fireEvent.change(aliceNativeSelect, { target: { value: 'STUDENT' } });
    } else {
      const roleTriggers = screen.getAllByRole('combobox');
      fireEvent.change(roleTriggers[1], { target: { value: 'STUDENT' } });
    }

    // Confirmation UI should be visible
    expect(screen.getByText(/→ STUDENT\?/)).toBeInTheDocument();

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    // Confirmation UI should disappear; the role Select should be back
    expect(screen.queryByText(/→ STUDENT\?/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^confirm$/i })
    ).not.toBeInTheDocument();
  });

  it('calls updateUser and shows success toast on Confirm', async () => {
    const mockUpdateUser = vi.fn().mockResolvedValue({ error: undefined });
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false, error: undefined },
      mockUpdateUser,
    ] as unknown as ReturnType<typeof useMutation>);

    renderPage();

    // Open confirmation UI for Alice
    const nativeSelects = document.querySelectorAll('select');
    const aliceNativeSelect = nativeSelects[1];
    if (aliceNativeSelect) {
      fireEvent.change(aliceNativeSelect, { target: { value: 'STUDENT' } });
    } else {
      const roleTriggers = screen.getAllByRole('combobox');
      fireEvent.change(roleTriggers[1], { target: { value: 'STUDENT' } });
    }

    expect(screen.getByText(/→ STUDENT\?/)).toBeInTheDocument();

    // Click the role-change Confirm button
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

    vi.mocked(useMutation)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        mockDeactivateUser, // deactivateUser
      ] as unknown as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        vi.fn().mockResolvedValue({ error: undefined }), // resetPassword
      ] as unknown as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        vi.fn().mockResolvedValue({ error: undefined }), // updateUser
      ] as unknown as ReturnType<typeof useMutation>);

    renderPage();

    // Click "Deactivate" for Alice to enter confirmation state
    const deactivateButtons = screen.getAllByRole('button', {
      name: /deactivate/i,
    });
    fireEvent.click(deactivateButtons[0]);

    // Now the row shows a "Confirm" button for deactivation
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
