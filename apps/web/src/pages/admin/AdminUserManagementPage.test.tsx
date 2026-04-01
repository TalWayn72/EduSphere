import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUserManagementPage } from './AdminUserManagementPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

const MOCK_USERS = {
  nodes: [
    {
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'STUDENT',
      status: 'active',
      lastLogin: '2026-03-01',
    },
    {
      id: 'u2',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'INSTRUCTOR',
      status: 'inactive',
      lastLogin: null,
    },
  ],
  totalCount: 2,
  pageInfo: { hasNextPage: false, hasPreviousPage: false },
};

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [
    { fetching: false, data: { adminUsers: MOCK_USERS }, error: undefined },
    vi.fn(),
  ]),
}));

import * as urql from 'urql';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUserManagementPage />
    </MemoryRouter>
  );
}

describe('AdminUserManagementPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: { adminUsers: MOCK_USERS }, error: undefined },
      vi.fn(),
    ] as never);
  });

  it('renders without crashing', () => {
    renderPage();
    expect(
      screen.getByTestId('admin-user-management-page')
    ).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, data: undefined, error: undefined },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('user-table-skeleton')).toBeInTheDocument();
  });

  it('displays correct data-testid attributes', () => {
    renderPage();
    expect(screen.getByTestId('user-management-table')).toBeInTheDocument();
    expect(screen.getByTestId('user-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('role-filter-select')).toBeInTheDocument();
  });

  it('renders user rows with names', () => {
    renderPage();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('displays BETA badge', () => {
    renderPage();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});
