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

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
    useQuery: vi.fn(() => [{ fetching: false, data: null }, vi.fn()]),
  };
});

import { useAuthRole } from '@/hooks/useAuthRole';

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
});
