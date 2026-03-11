import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PilotRequestsAdminPage } from './PilotRequestsAdminPage';

// Mock AdminLayout to avoid ThemeProvider/AppSidebar dependency
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="admin-layout">
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

// Mock useAuthRole to SUPER_ADMIN
vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'SUPER_ADMIN'),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const MOCK_REQUESTS = [
  {
    id: 'req-001',
    orgName: 'MIT',
    orgType: 'UNIVERSITY',
    contactEmail: 'admin@mit.edu',
    estimatedUsers: 5000,
    status: 'PENDING',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'req-002',
    orgName: 'Acme Corp',
    orgType: 'CORPORATE',
    contactEmail: 'hr@acme.com',
    estimatedUsers: 200,
    status: 'APPROVED',
    createdAt: '2026-02-15T00:00:00.000Z',
  },
];

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: { allPilotRequests: MOCK_REQUESTS }, fetching: false, error: undefined }]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
}));

import { useQuery } from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

function renderPage() {
  return render(
    <MemoryRouter>
      <PilotRequestsAdminPage />
    </MemoryRouter>
  );
}

describe('PilotRequestsAdminPage', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      { data: { allPilotRequests: MOCK_REQUESTS }, fetching: false, error: undefined },
    ] as unknown as ReturnType<typeof useQuery>);
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    mockNavigate.mockClear();
  });

  it('renders pilot-requests-page test id', () => {
    renderPage();
    expect(screen.getByTestId('pilot-requests-page')).toBeInTheDocument();
  });

  it('renders the pilot requests table', () => {
    renderPage();
    expect(screen.getByTestId('pilot-requests-table')).toBeInTheDocument();
  });

  it('shows MIT in the table', () => {
    renderPage();
    expect(screen.getByText('MIT')).toBeInTheDocument();
  });

  it('shows Acme Corp in the table', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows PENDING status badge', () => {
    renderPage();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows APPROVED status badge', () => {
    renderPage();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
  });

  it('renders Approve button for first request', () => {
    renderPage();
    expect(screen.getByTestId('approve-btn-req-001')).toBeInTheDocument();
  });

  it('renders Reject button for first request', () => {
    renderPage();
    expect(screen.getByTestId('reject-btn-req-001')).toBeInTheDocument();
  });

  it('renders Approve button for second request', () => {
    renderPage();
    expect(screen.getByTestId('approve-btn-req-002')).toBeInTheDocument();
  });

  it('renders Reject button for second request', () => {
    renderPage();
    expect(screen.getByTestId('reject-btn-req-002')).toBeInTheDocument();
  });

  it('redirects to /dashboard if role is not SUPER_ADMIN', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows empty state when no requests', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: { allPilotRequests: [] }, fetching: false, error: undefined },
    ] as unknown as ReturnType<typeof useQuery>);
    renderPage();
    expect(screen.getByText(/no pilot requests yet/i)).toBeInTheDocument();
  });
});
