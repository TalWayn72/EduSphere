/**
 * CatQuestionCard component tests
 *
 * Verifies:
 *  1. Renders question stem
 *  2. Renders all options
 *  3. Highlights selected option
 *  4. Calls onSelect when option clicked
 *  5. Handles empty options gracefully
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatQuestionCard } from './CatQuestionCard';

const OPTIONS = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
  { id: 'c', text: 'Option C' },
];

describe('CatQuestionCard', () => {
  it('renders the question stem', () => {
    render(
      <CatQuestionCard stem="What is 2+2?" options={OPTIONS} selectedAnswer={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <CatQuestionCard stem="Q?" options={OPTIONS} selectedAnswer={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('highlights the selected option', () => {
    render(
      <CatQuestionCard stem="Q?" options={OPTIONS} selectedAnswer="b" onSelect={vi.fn()} />,
    );
    const selectedBtn = screen.getByText('Option B').closest('button');
    expect(selectedBtn?.className).toContain('border-primary');
  });

  it('does not highlight unselected options', () => {
    render(
      <CatQuestionCard stem="Q?" options={OPTIONS} selectedAnswer="b" onSelect={vi.fn()} />,
    );
    const unselectedBtn = screen.getByText('Option A').closest('button');
    expect(unselectedBtn?.className).not.toContain('border-primary');
  });

  it('calls onSelect with option id when clicked', () => {
    const onSelect = vi.fn();
    render(
      <CatQuestionCard stem="Q?" options={OPTIONS} selectedAnswer={null} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByText('Option C'));
    expect(onSelect).toHaveBeenCalledWith('c');
  });

  it('handles empty options array', () => {
    const { container } = render(
      <CatQuestionCard stem="No options" options={[]} selectedAnswer={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('No options')).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
