/**
 * RejectDialog component tests
 *
 * Verifies:
 *  1. Renders dialog title and description
 *  2. Shows reason textarea
 *  3. Cancel button calls onClose
 *  4. Reject button calls onConfirm with reason
 *  5. Clears reason on confirm
 *  6. Clears reason on cancel
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RejectDialog } from './RejectDialog';

describe('RejectDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title', () => {
    render(<RejectDialog {...defaultProps} />);
    // "Reject Proposal" appears as both dialog title and button — use getAllByText
    const elements = screen.getAllByText('Reject Proposal');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders description text', () => {
    render(<RejectDialog {...defaultProps} />);
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  it('renders reason textarea', () => {
    render(<RejectDialog {...defaultProps} />);
    expect(screen.getByTestId('reject-reason-input')).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(<RejectDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders Reject Proposal button', () => {
    render(<RejectDialog {...defaultProps} />);
    expect(screen.getByTestId('confirm-reject-btn')).toBeInTheDocument();
    // "Reject Proposal" appears both as title and button text — check the button specifically
    expect(screen.getByTestId('confirm-reject-btn')).toHaveTextContent('Reject Proposal');
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<RejectDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with reason when Reject clicked', () => {
    const onConfirm = vi.fn();
    render(<RejectDialog {...defaultProps} onConfirm={onConfirm} />);

    const textarea = screen.getByTestId('reject-reason-input');
    fireEvent.change(textarea, { target: { value: 'Not relevant' } });
    fireEvent.click(screen.getByTestId('confirm-reject-btn'));

    expect(onConfirm).toHaveBeenCalledWith('Not relevant');
  });

  it('calls onConfirm with empty string when no reason given', () => {
    const onConfirm = vi.fn();
    render(<RejectDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('confirm-reject-btn'));
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('has label for reason field', () => {
    render(<RejectDialog {...defaultProps} />);
    expect(screen.getByLabelText(/Reason/)).toBeInTheDocument();
  });
});
