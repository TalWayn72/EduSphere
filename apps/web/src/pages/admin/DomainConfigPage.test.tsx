import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainConfigPage } from './DomainConfigPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

const MOCK_DOMAINS = [
  {
    id: 'dom-1',
    domain: 'learn.acme.com',
    verificationToken: 'tok-1',
    verificationRecordType: 'TXT',
    verifiedAt: null,
    sslStatus: 'pending',
    createdAt: '2026-03-22T00:00:00Z',
  },
  {
    id: 'dom-2',
    domain: 'training.corp.io',
    verificationToken: 'tok-2',
    verificationRecordType: 'TXT',
    verifiedAt: '2026-03-20T00:00:00Z',
    sslStatus: 'active',
    createdAt: '2026-03-19T00:00:00Z',
  },
];

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [
    {
      fetching: false,
      data: {
        customDomains: MOCK_DOMAINS,
        myOrganization: { slug: 'acme' },
      },
      error: undefined,
    },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}));

import * as urql from 'urql';

function renderPage() {
  return render(
    <MemoryRouter>
      <DomainConfigPage />
    </MemoryRouter>
  );
}

describe('DomainConfigPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        data: {
          customDomains: MOCK_DOMAINS,
          myOrganization: { slug: 'acme' },
        },
        error: undefined,
      },
      vi.fn(),
    ] as never);
  });

  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('domain-config-page')).toBeInTheDocument();
  });

  it('shows current subdomain', () => {
    renderPage();
    expect(screen.getByText('acme.edusphere.io')).toBeInTheDocument();
  });

  it('renders custom domains list', () => {
    renderPage();
    expect(screen.getByTestId('domains-list')).toBeInTheDocument();
    expect(screen.getByText('learn.acme.com')).toBeInTheDocument();
    expect(screen.getByText('training.corp.io')).toBeInTheDocument();
  });

  it('shows Verified badge for verified domains', () => {
    renderPage();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows Pending badge for unverified domains', () => {
    renderPage();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows Check button for unverified domains', () => {
    renderPage();
    const checkButtons = screen.getAllByText('Check');
    expect(checkButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Remove button for each domain', () => {
    renderPage();
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(2);
  });

  it('shows Add Domain button', () => {
    renderPage();
    expect(screen.getByText('Add Domain')).toBeInTheDocument();
  });

  it('shows domain input field', () => {
    renderPage();
    const input = screen.getByPlaceholderText('learn.example.com');
    expect(input).toBeInTheDocument();
  });

  it('renders loading state when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: true,
        data: undefined,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('domain-config-page')).toBeInTheDocument();
  });

  it('shows SSL status badges', () => {
    renderPage();
    expect(screen.getByTestId('ssl-pending')).toBeInTheDocument();
    expect(screen.getByTestId('ssl-active')).toBeInTheDocument();
  });
});
