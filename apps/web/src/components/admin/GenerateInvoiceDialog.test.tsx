/**
 * GenerateInvoiceDialog — tests for invoice generation modal.
 *
 * Verifies:
 *  1. Renders dialog title when open
 *  2. Submit disabled with empty tenant
 *  3. Fires onGenerate with form values
 *  4. Cancel fires onClose
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog';

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onGenerate: vi.fn(),
};

describe('GenerateInvoiceDialog', () => {
  it('renders dialog title when open', () => {
    render(<GenerateInvoiceDialog {...baseProps} />);
    expect(screen.getByText('Generate Invoice')).toBeInTheDocument();
  });

  it('submit button disabled when tenant is empty', () => {
    render(<GenerateInvoiceDialog {...baseProps} />);
    expect(screen.getByTestId('submit-invoice-btn')).toBeDisabled();
  });

  it('fires onGenerate with form values', () => {
    const onGenerate = vi.fn();
    render(<GenerateInvoiceDialog {...baseProps} onGenerate={onGenerate} />);
    fireEvent.change(screen.getByTestId('invoice-tenant-input'), {
      target: { value: 'tenant-123' },
    });
    fireEvent.click(screen.getByTestId('submit-invoice-btn'));
    expect(onGenerate).toHaveBeenCalledWith('tenant-123', expect.any(Number), 'STARTER');
  });

  it('fires onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<GenerateInvoiceDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has plan selector with options', () => {
    render(<GenerateInvoiceDialog {...baseProps} />);
    const select = screen.getByTestId('invoice-plan-select');
    expect(select).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<GenerateInvoiceDialog {...baseProps} open={false} />);
    expect(screen.queryByText('Generate Invoice')).not.toBeInTheDocument();
  });
});
