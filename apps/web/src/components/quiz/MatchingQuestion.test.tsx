import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchingQuestion } from './MatchingQuestion';
import type { Matching } from '@/types/quiz';

const mockItem: Matching = {
  type: 'MATCHING',
  question: 'Match each country to its capital city',
  leftItems: [
    { id: 'fr', text: 'France' },
    { id: 'de', text: 'Germany' },
    { id: 'es', text: 'Spain' },
  ],
  rightItems: [
    { id: 'par', text: 'Paris' },
    { id: 'ber', text: 'Berlin' },
    { id: 'mad', text: 'Madrid' },
  ],
  correctPairs: [
    { leftId: 'fr', rightId: 'par' },
    { leftId: 'de', rightId: 'ber' },
    { leftId: 'es', rightId: 'mad' },
  ],
};

describe('MatchingQuestion', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it('renders the question text', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('Match each country to its capital city')).toBeInTheDocument();
  });

  it('renders instruction hint text', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(
      screen.getByText('Click a left item then a right item to create a pair')
    ).toBeInTheDocument();
  });

  it('renders all left items', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('Spain')).toBeInTheDocument();
  });

  it('renders all right items', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('renders 6 buttons total (3 left + 3 right)', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('left button has aria-pressed="false" when not selected', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'France' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('left button has aria-pressed="true" after clicking it', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'France' }));
    expect(screen.getByRole('button', { name: 'France' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('calls onChange with new pair when left then right clicked', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'France' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paris' }));
    expect(onChange).toHaveBeenCalledWith([{ leftId: 'fr', rightId: 'par' }]);
  });

  it('clears selection after a pair is created', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'France' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paris' }));
    // After pairing, France button should no longer be aria-pressed
    expect(screen.getByRole('button', { name: 'France' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('clicking same left item again deselects it', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Germany' }));
    fireEvent.click(screen.getByRole('button', { name: 'Germany' }));
    expect(screen.getByRole('button', { name: 'Germany' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('replaces existing pair when same left item is re-paired', () => {
    render(
      <MatchingQuestion
        item={mockItem}
        value={[{ leftId: 'fr', rightId: 'par' }]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'France' }));
    fireEvent.click(screen.getByRole('button', { name: 'Berlin' }));
    expect(onChange).toHaveBeenCalledWith([{ leftId: 'fr', rightId: 'ber' }]);
  });

  it('does not call onChange and ignores clicks when disabled', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('button', { name: 'France' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paris' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('left buttons are disabled when disabled prop is true', () => {
    render(<MatchingQuestion item={mockItem} value={[]} onChange={onChange} disabled />);
    expect(screen.getByRole('button', { name: 'France' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Germany' })).toBeDisabled();
  });
});
