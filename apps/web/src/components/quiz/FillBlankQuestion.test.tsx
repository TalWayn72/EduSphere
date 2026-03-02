import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FillBlankQuestion } from './FillBlankQuestion';
import type { FillBlank } from '@/types/quiz';

const makeItem = (overrides?: Partial<FillBlank>): FillBlank => ({
  type: 'FILL_BLANK',
  question: 'The capital of France is {{blank}}.',
  correctAnswer: 'Paris',
  useSemanticMatching: false,
  similarityThreshold: 0.8,
  ...overrides,
});

describe('FillBlankQuestion', () => {
  let onChange: (value: string) => void;

  beforeEach(() => {
    onChange = vi.fn() as unknown as (value: string) => void;
  });

  it('renders inline input when question contains {{blank}}', () => {
    render(
      <FillBlankQuestion item={makeItem()} value="" onChange={onChange} />
    );
    const input = screen.getByRole('textbox', { name: 'Fill in the blank' });
    expect(input).toBeInTheDocument();
  });

  it('renders text before blank token', () => {
    render(
      <FillBlankQuestion item={makeItem()} value="" onChange={onChange} />
    );
    expect(screen.getByText('The capital of France is')).toBeInTheDocument();
  });

  it('renders text after blank token', () => {
    render(
      <FillBlankQuestion item={makeItem()} value="" onChange={onChange} />
    );
    expect(screen.getByText('.')).toBeInTheDocument();
  });

  it('renders standalone input when question has no {{blank}}', () => {
    render(
      <FillBlankQuestion
        item={makeItem({ question: 'What is the speed of light?' })}
        value=""
        onChange={onChange}
      />
    );
    expect(screen.getByText('What is the speed of light?')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Your answer' })
    ).toBeInTheDocument();
  });

  it('shows the current value in the input', () => {
    render(
      <FillBlankQuestion item={makeItem()} value="Berlin" onChange={onChange} />
    );
    expect(screen.getByDisplayValue('Berlin')).toBeInTheDocument();
  });

  it('calls onChange when user types in inline input', () => {
    render(
      <FillBlankQuestion item={makeItem()} value="" onChange={onChange} />
    );
    const input = screen.getByRole('textbox', { name: 'Fill in the blank' });
    fireEvent.change(input, { target: { value: 'Paris' } });
    expect(onChange).toHaveBeenCalledWith('Paris');
  });

  it('calls onChange when user types in standalone input', () => {
    render(
      <FillBlankQuestion
        item={makeItem({ question: 'Name a planet.' })}
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByRole('textbox', { name: 'Your answer' });
    fireEvent.change(input, { target: { value: 'Mars' } });
    expect(onChange).toHaveBeenCalledWith('Mars');
  });

  it('disables input when disabled prop is true (inline)', () => {
    render(
      <FillBlankQuestion
        item={makeItem()}
        value=""
        onChange={onChange}
        disabled
      />
    );
    const input = screen.getByRole('textbox', { name: 'Fill in the blank' });
    expect(input).toBeDisabled();
  });

  it('disables input when disabled prop is true (standalone)', () => {
    render(
      <FillBlankQuestion
        item={makeItem({ question: 'Name a country.' })}
        value=""
        onChange={onChange}
        disabled
      />
    );
    const input = screen.getByRole('textbox', { name: 'Your answer' });
    expect(input).toBeDisabled();
  });

  it('shows semantic matching hint when useSemanticMatching is true', () => {
    render(
      <FillBlankQuestion
        item={makeItem({ useSemanticMatching: true })}
        value=""
        onChange={onChange}
      />
    );
    expect(
      screen.getByText(
        'Answers are evaluated using semantic similarity matching.'
      )
    ).toBeInTheDocument();
  });

  it('does not show semantic matching hint when useSemanticMatching is false', () => {
    render(
      <FillBlankQuestion item={makeItem()} value="" onChange={onChange} />
    );
    expect(
      screen.queryByText(
        'Answers are evaluated using semantic similarity matching.'
      )
    ).not.toBeInTheDocument();
  });

  it('inline input has placeholder "your answer"', () => {
    render(
      <FillBlankQuestion item={makeItem()} value="" onChange={onChange} />
    );
    const input = screen.getByPlaceholderText('your answer');
    expect(input).toBeInTheDocument();
  });
});
