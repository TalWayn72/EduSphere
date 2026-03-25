/**
 * InvoiceTable — tests for invoice history table.
 *
 * Verifies:
 *  1. Renders table with testid
 *  2. Renders invoice rows
 *  3. Shows status badges
 *  4. Shows download link for invoices with PDF
 *  5. Shows Pending for invoices without PDF
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoiceTable } from './InvoiceTable';
import type { Invoice } from '@/pages/admin/StripeInvoicePage';

const invoices: Invoice[] = [
  { id: 'inv-1', tenant: 'Acme Corp', plan: 'PROFESSIONAL', year: 2026, amount: 48000, status: 'paid', pdfUrl: 'https://example.com/inv.pdf' },
  { id: 'inv-2', tenant: 'Beta Inc', plan: 'STARTER', year: 2026, amount: 12000, status: 'draft', pdfUrl: '#' },
];

describe('InvoiceTable', () => {
  it('renders table with testid', () => {
    render(<InvoiceTable invoices={invoices} />);
    expect(screen.getByTestId('invoice-history-table')).toBeInTheDocument();
  });

  it('renders invoice rows', () => {
    render(<InvoiceTable invoices={invoices} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    render(<InvoiceTable invoices={invoices} />);
    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('shows Download link for invoices with PDF URL', () => {
    render(<InvoiceTable invoices={invoices} />);
    expect(screen.getByTestId('download-pdf-inv-1')).toHaveAttribute('href', 'https://example.com/inv.pdf');
  });

  it('shows Pending for invoices without valid PDF', () => {
    render(<InvoiceTable invoices={invoices} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('has accessible table label', () => {
    render(<InvoiceTable invoices={invoices} />);
    expect(screen.getByRole('table', { name: 'Invoice history' })).toBeInTheDocument();
  });
});
