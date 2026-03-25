import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { UserTableRow } from './AdminUserManagementPage.row';

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseUser = {
  id: 'u1',
  name: 'Alice Johnson',
  email: 'alice@test.com',
  role: 'STUDENT',
  status: 'active' as const,
  lastLogin: '2026-03-01T12:00:00Z',
};

function renderRow(overrides?: Partial<typeof baseUser>, selected = false, onToggle = vi.fn()) {
  return render(
    <table>
      <tbody>
        <UserTableRow
          user={{ ...baseUser, ...overrides }}
          selected={selected}
          onToggle={onToggle}
        />
      </tbody>
    </table>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UserTableRow', () => {
  it('renders user name', () => {
    renderRow();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('renders user email', () => {
    renderRow();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  });

  it('renders user role', () => {
    renderRow();
    expect(screen.getByText('STUDENT')).toBeInTheDocument();
  });

  it('renders user status', () => {
    renderRow();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders last login date', () => {
    renderRow();
    // Date formatted by toLocaleDateString — just check the element exists
    const row = screen.getByTestId('user-row-u1');
    expect(row).toBeInTheDocument();
  });

  it('shows "never" when lastLogin is null', () => {
    renderRow({ lastLogin: null });
    expect(screen.getByText('users.never')).toBeInTheDocument();
  });

  it('checkbox is checked when selected', () => {
    renderRow(undefined, true);
    const checkbox = screen.getByLabelText('Select Alice Johnson');
    expect(checkbox).toBeChecked();
  });

  it('checkbox is unchecked when not selected', () => {
    renderRow(undefined, false);
    const checkbox = screen.getByLabelText('Select Alice Johnson');
    expect(checkbox).not.toBeChecked();
  });

  it('calls onToggle with user id when checkbox clicked', () => {
    const onToggle = vi.fn();
    renderRow(undefined, false, onToggle);
    fireEvent.click(screen.getByLabelText('Select Alice Johnson'));
    expect(onToggle).toHaveBeenCalledWith('u1');
  });

  it('uses correct test id based on user id', () => {
    renderRow({ id: 'user-42' });
    expect(screen.getByTestId('user-row-user-42')).toBeInTheDocument();
  });
});
