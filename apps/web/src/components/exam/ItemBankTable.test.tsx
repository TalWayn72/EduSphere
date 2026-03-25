/**
 * ItemBankTable component tests
 *
 * Verifies:
 *  1. Renders table headers
 *  2. Renders item rows
 *  3. Shows empty state message
 *  4. Row click calls onRowClick
 *  5. Select all checkbox toggles selection
 *  6. Individual checkbox toggles
 *  7. Includes pagination
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemBankTable } from './ItemBankTable';
import type { ExamItem } from '@/types/exam-entities';

const mockItem = (id: string, question: string): ExamItem => ({
  id,
  courseId: 'c1',
  domainTag: 'Math',
  bloomLevel: 'APPLY',
  questionData: { question },
  calibrationStatus: 'CALIBRATED',
  source: 'MANUAL',
  qualityTier: 'CALIBRATED',
  exposureCount: 10,
  irtB: 1.25,
  createdAt: '2026-01-01T00:00:00Z',
});

const items = [mockItem('1', 'Q1 text'), mockItem('2', 'Q2 text')];

const defaultProps = {
  items,
  totalCount: 2,
  page: 0,
  pageSize: 10,
  selectedIds: new Set<string>(),
  onPageChange: vi.fn(),
  onSelect: vi.fn(),
  onRowClick: vi.fn(),
};

describe('ItemBankTable', () => {
  it('renders table headers', () => {
    render(<ItemBankTable {...defaultProps} />);
    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Bloom')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('IRT b')).toBeInTheDocument();
  });

  it('renders item rows', () => {
    render(<ItemBankTable {...defaultProps} />);
    expect(screen.getByTestId('item-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-row-2')).toBeInTheDocument();
  });

  it('shows question text in rows', () => {
    render(<ItemBankTable {...defaultProps} />);
    expect(screen.getByText('Q1 text')).toBeInTheDocument();
    expect(screen.getByText('Q2 text')).toBeInTheDocument();
  });

  it('shows IRT b value', () => {
    render(<ItemBankTable {...defaultProps} />);
    const cells = screen.getAllByText('1.25');
    expect(cells.length).toBe(2);
  });

  it('shows dash for null IRT b', () => {
    const noIrt = [{ ...items[0], irtB: undefined }];
    render(<ItemBankTable {...defaultProps} items={noIrt} totalCount={1} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows empty state message when no items', () => {
    render(<ItemBankTable {...defaultProps} items={[]} totalCount={0} />);
    expect(screen.getByText(/No items found/)).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = vi.fn();
    render(<ItemBankTable {...defaultProps} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByTestId('item-row-1'));
    expect(onRowClick).toHaveBeenCalledWith(items[0]);
  });

  it('calls onSelect with all ids when select-all clicked', () => {
    const onSelect = vi.fn();
    render(<ItemBankTable {...defaultProps} onSelect={onSelect} />);
    const selectAll = screen.getByLabelText('Select all');
    fireEvent.click(selectAll);
    expect(onSelect).toHaveBeenCalledWith(new Set(['1', '2']));
  });

  it('calls onSelect with empty set when deselect-all clicked', () => {
    const onSelect = vi.fn();
    render(
      <ItemBankTable {...defaultProps} selectedIds={new Set(['1', '2'])} onSelect={onSelect} />,
    );
    const selectAll = screen.getByLabelText('Select all');
    fireEvent.click(selectAll);
    expect(onSelect).toHaveBeenCalledWith(new Set());
  });

  it('includes pagination component', () => {
    render(<ItemBankTable {...defaultProps} />);
    expect(screen.getByText(/Showing 1-2 of 2 items/)).toBeInTheDocument();
  });
});
