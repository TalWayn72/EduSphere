import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LikertQuestion } from './LikertQuestion';
import type { Likert } from '@/types/quiz';

const makeItem = (overrides?: Partial<Likert>): Likert => ({
  type: 'LIKERT',
  question: 'How satisfied are you with this course?',
  scale: 5,
  ...overrides,
});

describe('LikertQuestion', () => {
  let onChange: (value: number) => void;

  beforeEach(() => {
    onChange = vi.fn() as unknown as (value: number) => void;
  });

  it('renders the question text', () => {
    render(
      <LikertQuestion item={makeItem()} value={null} onChange={onChange} />
    );
    expect(
      screen.getByText('How satisfied are you with this course?')
    ).toBeInTheDocument();
  });

  it('renders correct number of radio buttons for scale 5', () => {
    render(
      <LikertQuestion item={makeItem()} value={null} onChange={onChange} />
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
  });

  it('renders correct number of radio buttons for scale 7', () => {
    render(
      <LikertQuestion
        item={makeItem({ scale: 7 })}
        value={null}
        onChange={onChange}
      />
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(7);
  });

  it('renders default min label when no labels provided', () => {
    render(
      <LikertQuestion item={makeItem()} value={null} onChange={onChange} />
    );
    expect(screen.getByText('Strongly Disagree')).toBeInTheDocument();
  });

  it('renders default max label when no labels provided', () => {
    render(
      <LikertQuestion item={makeItem()} value={null} onChange={onChange} />
    );
    expect(screen.getByText('Strongly Agree')).toBeInTheDocument();
  });

  it('renders custom min and max labels', () => {
    render(
      <LikertQuestion
        item={makeItem({ labels: { min: 'Not at all', max: 'Extremely' } })}
        value={null}
        onChange={onChange}
      />
    );
    expect(screen.getByText('Not at all')).toBeInTheDocument();
    expect(screen.getByText('Extremely')).toBeInTheDocument();
  });

  it('no radio is checked when value is null', () => {
    render(
      <LikertQuestion item={makeItem()} value={null} onChange={onChange} />
    );
    screen.getAllByRole('radio').forEach((r) => expect(r).not.toBeChecked());
  });

  it('correct radio is checked when value is set', () => {
    render(<LikertQuestion item={makeItem()} value={3} onChange={onChange} />);
    const radio3 = screen.getByRole('radio', { name: '3' });
    expect(radio3).toBeChecked();
  });

  it('calls onChange with selected value when radio clicked', () => {
    render(
      <LikertQuestion item={makeItem()} value={null} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('radio', { name: '4' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('calls onChange with correct value when different radio clicked', () => {
    render(<LikertQuestion item={makeItem()} value={2} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: '5' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('disables all radios when disabled prop is true', () => {
    render(
      <LikertQuestion
        item={makeItem()}
        value={null}
        onChange={onChange}
        disabled
      />
    );
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled());
  });

  it('radiogroup has aria-label matching question', () => {
    render(
      <LikertQuestion item={makeItem()} value={null} onChange={onChange} />
    );
    expect(
      screen.getByRole('radiogroup', {
        name: 'How satisfied are you with this course?',
      })
    ).toBeInTheDocument();
  });

  it('renders numeric labels 1 through scale', () => {
    render(
      <LikertQuestion
        item={makeItem({ scale: 4 })}
        value={null}
        onChange={onChange}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
