import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminAuditLogPage } from './AdminAuditLogPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

const MOCK_ENTRIES = {
  nodes: [
    {
      id: 'a1',
      timestamp: '2026-03-17T10:00:00Z',
      user: 'admin@example.com',
      action: 'USER_CREATED',
      target: 'user:u123',
      details: 'Created user Alice',
    },
    {
      id: 'a2',
      timestamp: '2026-03-17T09:00:00Z',
      user: 'admin@example.com',
      action: 'COURSE_PUBLISHED',
      target: 'course:c456',
      details: 'Published Intro to AI',
    },
  ],
  totalCount: 2,
};

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [
    { fetching: false, data: { auditLogs: MOCK_ENTRIES }, error: undefined },
    vi.fn(),
  ]),
}));

import * as urql from 'urql';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAuditLogPage />
    </MemoryRouter>
  );
}

describe('AdminAuditLogPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: { auditLogs: MOCK_ENTRIES }, error: undefined },
      vi.fn(),
    ] as never);
  });

  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('admin-audit-log-page')).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, data: undefined, error: undefined },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('audit-log-skeleton')).toBeInTheDocument();
  });

  it('displays correct data-testid attributes', () => {
    renderPage();
    expect(screen.getByTestId('audit-log-table')).toBeInTheDocument();
    expect(screen.getByTestId('audit-date-filter')).toBeInTheDocument();
  });

  it('renders audit log entries', () => {
    renderPage();
    expect(screen.getByText('USER_CREATED')).toBeInTheDocument();
    expect(screen.getByText('COURSE_PUBLISHED')).toBeInTheDocument();
  });

  it('displays BETA badge', () => {
    renderPage();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});
