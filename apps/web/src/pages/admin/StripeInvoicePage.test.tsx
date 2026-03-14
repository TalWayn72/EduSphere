import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeInvoicePage } from './StripeInvoicePage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="admin-layout">
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'SUPER_ADMIN'),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const MOCK_INVOICES = [
  { id: 'inv-001', tenant: 'Acme University', plan: 'ENTERPRISE', year: 2025, amount: 12000, status: 'paid', pdfUrl: 'https://example.com/inv-001.pdf' },
  { id: 'inv-002', tenant: 'TechCorp Inc', plan: 'PROFESSIONAL', year: 2025, amount: 4800, status: 'overdue', pdfUrl: '' },
  { id: 'inv-003', tenant: 'Global Learn', plan: 'STARTER', year: 2026, amount: 1200, status: 'draft', pdfUrl: '#' },
];

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
    useQuery: vi.fn(() => [
      { fetching: false, data: { invoices: MOCK_INVOICES }, error: undefined },
      vi.fn(),
    ]),
  };
});

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { useAuthRole } from '@/hooks/useAuthRole';
import * as urql from 'urql';

function resetUrqlMock() {
  vi.mocked(urql.useQuery).mockReturnValue([
    { fetching: false, data: { invoices: MOCK_INVOICES }, error: undefined },
    vi.fn(),
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <StripeInvoicePage />
    </MemoryRouter>
  );
}

describe('StripeInvoicePage', () => {
  beforeEach(() => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    mockNavigate.mockClear();
    resetUrqlMock();
  });

  it('shows access-denied for ORG_ADMIN', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('shows access-denied for INSTRUCTOR', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('shows access-denied for STUDENT', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('renders stripe-invoice-page for SUPER_ADMIN', () => {
    renderPage();
    expect(screen.getByTestId('stripe-invoice-page')).toBeInTheDocument();
  });

  it('shows invoice-history-table', () => {
    renderPage();
    expect(screen.getByTestId('invoice-history-table')).toBeInTheDocument();
  });

  it('shows generate-invoice-btn', () => {
    renderPage();
    expect(screen.getByTestId('generate-invoice-btn')).toBeInTheDocument();
  });

  it('shows stripe-setup-notice', () => {
    renderPage();
    expect(screen.getByTestId('stripe-setup-notice')).toBeInTheDocument();
    expect(screen.getByTestId('stripe-setup-notice').textContent).toMatch(/STRIPE_SECRET_KEY/);
  });

  it('renders invoice rows with tenant names', () => {
    renderPage();
    expect(screen.getByText('Acme University')).toBeInTheDocument();
    expect(screen.getByText('TechCorp Inc')).toBeInTheDocument();
    expect(screen.getByText('Global Learn')).toBeInTheDocument();
  });

  it('renders status badges for invoices', () => {
    renderPage();
    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('shows empty state when no invoices', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      { fetching: false, data: { invoices: [] }, error: undefined },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('shows Download link for invoices with valid PDF URL', () => {
    renderPage();
    // inv-001 has valid pdfUrl, should show Download link
    expect(screen.getByTestId('download-pdf-inv-001')).toBeInTheDocument();
  });
});
