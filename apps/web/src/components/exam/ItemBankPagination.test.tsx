/**
 * ItemBankPagination component tests
 *
 * Verifies:
 *  1. Shows correct "Showing X-Y of Z items" text
 *  2. Shows correct page number
 *  3. Previous disabled on first page
 *  4. Next disabled on last page
 *  5. Buttons call onPageChange correctly
 *  6. Edge case: totalCount = 0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemBankPagination } from './ItemBankPagination';

describe('ItemBankPagination', () => {
  it('shows correct range text', () => {
    render(
      <ItemBankPagination
        page={0}
        pageSize={10}
        totalCount={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Showing 1-10 of 45 items')).toBeInTheDocument();
  });

  it('shows correct range on middle page', () => {
    render(
      <ItemBankPagination
        page={2}
        pageSize={10}
        totalCount={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Showing 21-30 of 45 items')).toBeInTheDocument();
  });

  it('clamps end to totalCount on last page', () => {
    render(
      <ItemBankPagination
        page={4}
        pageSize={10}
        totalCount={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Showing 41-45 of 45 items')).toBeInTheDocument();
  });

  it('shows correct page number', () => {
    render(
      <ItemBankPagination
        page={2}
        pageSize={10}
        totalCount={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Page 3 of 5')).toBeInTheDocument();
  });

  it('disables Previous on first page', () => {
    render(
      <ItemBankPagination
        page={0}
        pageSize={10}
        totalCount={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('disables Next on last page', () => {
    render(
      <ItemBankPagination
        page={4}
        pageSize={10}
        totalCount={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('enables both buttons on middle page', () => {
    render(
      <ItemBankPagination
        page={2}
        pageSize={10}
        totalCount={45}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Previous')).not.toBeDisabled();
    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  it('calls onPageChange with previous page', () => {
    const onChange = vi.fn();
    render(
      <ItemBankPagination
        page={2}
        pageSize={10}
        totalCount={45}
        onPageChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Previous'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with next page', () => {
    const onChange = vi.fn();
    render(
      <ItemBankPagination
        page={2}
        pageSize={10}
        totalCount={45}
        onPageChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Next'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('handles zero items', () => {
    render(
      <ItemBankPagination
        page={0}
        pageSize={10}
        totalCount={0}
        onPageChange={vi.fn()}
      />
    );
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
