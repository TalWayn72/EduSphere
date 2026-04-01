import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('./TeamManagement.invites', () => ({
  PendingInvitesTable: ({
    invites,
    fetching,
  }: {
    invites: unknown[];
    fetching: boolean;
  }) => (
    <div
      data-testid="invites-table"
      data-count={invites.length}
      data-fetching={fetching}
    />
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { TeamManagement } from './TeamManagement';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(invites: unknown[] = [], fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: { pendingInvites: invites }, fetching, error: undefined },
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([{}, vi.fn()] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TeamManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders team management page', () => {
    setupMocks();
    render(<TeamManagement />);
    expect(screen.getByTestId('team-management-page')).toBeInTheDocument();
  });

  it('renders invite form with email input', () => {
    setupMocks();
    render(<TeamManagement />);
    expect(screen.getByLabelText('team.emailLabel')).toBeInTheDocument();
  });

  it('renders CSV upload section', () => {
    setupMocks();
    render(<TeamManagement />);
    expect(screen.getByText('team.csvTitle')).toBeInTheDocument();
    expect(screen.getByLabelText('team.csvLabel')).toBeInTheDocument();
  });

  it('renders send invite button', () => {
    setupMocks();
    render(<TeamManagement />);
    expect(screen.getByText('team.sendInvite')).toBeInTheDocument();
  });

  it('renders PendingInvitesTable', () => {
    setupMocks([
      { id: '1', email: 'a@b.com', role: 'STUDENT', status: 'pending' },
    ]);
    render(<TeamManagement />);
    const table = screen.getByTestId('invites-table');
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute('data-count', '1');
  });

  it('renders within AdminLayout', () => {
    setupMocks();
    render(<TeamManagement />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });
});
