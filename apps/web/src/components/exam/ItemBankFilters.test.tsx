/**
 * ItemBankFilters component tests
 *
 * Verifies:
 *  1. Renders filter bar with data-testid
 *  2. Renders all 4 select triggers
 *  3. Initial state shows placeholder/all values
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItemBankFilters } from './ItemBankFilters';

describe('ItemBankFilters', () => {
  const defaultProps = {
    domains: ['Math', 'Science', 'History'],
    filters: {},
    onChange: vi.fn(),
  };

  it('renders the filter bar', () => {
    render(<ItemBankFilters {...defaultProps} />);
    expect(screen.getByTestId('item-bank-filters')).toBeInTheDocument();
  });

  it('renders 4 select triggers', () => {
    const { container } = render(<ItemBankFilters {...defaultProps} />);
    const triggers = container.querySelectorAll('button[role="combobox"]');
    expect(triggers.length).toBe(4);
  });

  it('shows "All Domains" by default when no domain filter set', () => {
    render(<ItemBankFilters {...defaultProps} />);
    // The SelectValue shows the text of the selected value
    expect(screen.getByText('All Domains')).toBeInTheDocument();
  });

  it('shows "All Levels" by default when no bloom filter set', () => {
    render(<ItemBankFilters {...defaultProps} />);
    expect(screen.getByText('All Levels')).toBeInTheDocument();
  });

  it('shows "All Statuses" by default when no status filter set', () => {
    render(<ItemBankFilters {...defaultProps} />);
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
  });

  it('shows "All Sources" by default when no source filter set', () => {
    render(<ItemBankFilters {...defaultProps} />);
    expect(screen.getByText('All Sources')).toBeInTheDocument();
  });
});
