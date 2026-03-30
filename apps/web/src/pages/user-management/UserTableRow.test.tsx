import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserTableRow } from './UserTableRow';
import type { AdminUser } from './user-management.types';

// ── shadcn mocks ──────────────────────────────────────────────────────────────
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span data-testid="badge" {...props}>{children}</span>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" data-onvaluechange={onValueChange ? 'yes' : 'no'}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`} role="option">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="select-trigger">{children}</button>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr {...props}>{children}</tr>
  ),
  TableCell: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td {...props}>{children}</td>
  ),
}));

// ── fixture ───────────────────────────────────────────────────────────────────
const mockUser: AdminUser = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'INSTRUCTOR',
  tenantId: 'tenant-1',
  createdAt: '2026-01-10T00:00:00Z',
};

const defaultProps = {
  user: mockUser,
  editingRole: {} as Record<string, string>,
  confirmDeactivate: null as string | null,
  confirmRoleChange: null as { userId: string; newRole: string } | null,
  onRoleChange: vi.fn(),
  onConfirmRoleChange: vi.fn(),
  onCancelRoleChange: vi.fn(),
  onResetPassword: vi.fn(),
  onDeactivate: vi.fn(),
  onConfirmDeactivate: vi.fn(),
};

function renderRow(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(
    <table>
      <tbody>
        <UserTableRow {...props} />
      </tbody>
    </table>
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('UserTableRow — basic rendering', () => {
  it('renders user full name', () => {
    renderRow();
    expect(screen.getByText('Alice Smith')).toBeTruthy();
  });

  it('renders user email', () => {
    renderRow();
    expect(screen.getByText('alice@example.com')).toBeTruthy();
  });

  it('renders created date', () => {
    renderRow();
    const formatted = new Date('2026-01-10T00:00:00Z').toLocaleDateString();
    expect(screen.getByText(formatted)).toBeTruthy();
  });

  it('renders role badge with current role', () => {
    renderRow();
    expect(screen.getByText('INSTRUCTOR')).toBeTruthy();
  });

  it('renders all role options in select', () => {
    renderRow();
    expect(screen.getByTestId('select-item-SUPER_ADMIN')).toBeTruthy();
    expect(screen.getByTestId('select-item-ORG_ADMIN')).toBeTruthy();
    expect(screen.getByTestId('select-item-INSTRUCTOR')).toBeTruthy();
    expect(screen.getByTestId('select-item-STUDENT')).toBeTruthy();
    expect(screen.getByTestId('select-item-RESEARCHER')).toBeTruthy();
  });
});

describe('UserTableRow — action buttons', () => {
  it('renders Reset Pw button', () => {
    renderRow();
    expect(screen.getByText('Reset Pw')).toBeTruthy();
  });

  it('calls onResetPassword with userId when Reset Pw clicked', () => {
    const onResetPassword = vi.fn();
    renderRow({ onResetPassword });
    fireEvent.click(screen.getByText('Reset Pw'));
    expect(onResetPassword).toHaveBeenCalledWith('user-1');
  });

  it('renders Deactivate button by default', () => {
    renderRow();
    expect(screen.getByText('Deactivate')).toBeTruthy();
  });

  it('calls onConfirmDeactivate when Deactivate clicked', () => {
    const onConfirmDeactivate = vi.fn();
    renderRow({ onConfirmDeactivate });
    fireEvent.click(screen.getByText('Deactivate'));
    expect(onConfirmDeactivate).toHaveBeenCalledWith('user-1');
  });
});

describe('UserTableRow — deactivation confirmation', () => {
  it('shows Confirm button when confirmDeactivate matches user id', () => {
    renderRow({ confirmDeactivate: 'user-1' });
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.queryByText('Deactivate')).toBeNull();
  });

  it('calls onDeactivate with userId when Confirm clicked', () => {
    const onDeactivate = vi.fn();
    renderRow({ confirmDeactivate: 'user-1', onDeactivate });
    fireEvent.click(screen.getByText('Confirm'));
    expect(onDeactivate).toHaveBeenCalledWith('user-1');
  });

  it('shows Deactivate when confirmDeactivate is for a different user', () => {
    renderRow({ confirmDeactivate: 'other-user' });
    expect(screen.getByText('Deactivate')).toBeTruthy();
    expect(screen.queryByText('Confirm')).toBeNull();
  });
});

describe('UserTableRow — role change confirmation', () => {
  it('shows role change confirmation UI when confirmRoleChange matches', () => {
    renderRow({
      confirmRoleChange: { userId: 'user-1', newRole: 'ORG_ADMIN' },
    });
    expect(screen.getByText(/ORG_ADMIN\?/)).toBeTruthy();
  });

  it('shows Confirm and Cancel for role change', () => {
    renderRow({
      confirmRoleChange: { userId: 'user-1', newRole: 'STUDENT' },
    });
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onConfirmRoleChange when Confirm clicked', () => {
    const onConfirmRoleChange = vi.fn();
    renderRow({
      confirmRoleChange: { userId: 'user-1', newRole: 'STUDENT' },
      onConfirmRoleChange,
    });
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirmRoleChange).toHaveBeenCalledTimes(1);
  });

  it('calls onCancelRoleChange when Cancel clicked', () => {
    const onCancelRoleChange = vi.fn();
    renderRow({
      confirmRoleChange: { userId: 'user-1', newRole: 'STUDENT' },
      onCancelRoleChange,
    });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancelRoleChange).toHaveBeenCalledTimes(1);
  });

  it('shows select when confirmRoleChange is for different user', () => {
    renderRow({
      confirmRoleChange: { userId: 'other-user', newRole: 'STUDENT' },
    });
    expect(screen.getByTestId('select')).toBeTruthy();
  });
});
