import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import type { MultipleChoice } from '@/types/quiz';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SINGLE_SELECT: MultipleChoice = {
  type: 'MULTIPLE_CHOICE',
  question: 'What is the capital of France?',
  options: [
    { id: 'opt-a', text: 'London' },
    { id: 'opt-b', text: 'Paris' },
    { id: 'opt-c', text: 'Berlin' },
  ],
  correctOptionIds: ['opt-b'],
};

const MULTI_SELECT: MultipleChoice = {
  type: 'MULTIPLE_CHOICE',
  question: 'Which are primary colours?',
  options: [
    { id: 'opt-r', text: 'Red' },
    { id: 'opt-g', text: 'Green' },
    { id: 'opt-b', text: 'Blue' },
    { id: 'opt-y', text: 'Yellow' },
  ],
  correctOptionIds: ['opt-r', 'opt-b', 'opt-y'],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MultipleChoiceQuestion', () => {
  it('renders the question text', () => {
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={[]}
        onChange={vi.fn()}
      />
    );
    expect(
      screen.getByText('What is the capital of France?')
    ).toBeInTheDocument();
  });

  it('renders all option texts', () => {
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={[]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
  });

  it('calls onChange with selected option id for single-select', () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={[]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Paris'));
    expect(onChange).toHaveBeenCalledWith(['opt-b']);
  });

  it('replaces selection on second click in single-select mode', () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={['opt-a']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Berlin'));
    expect(onChange).toHaveBeenCalledWith(['opt-c']);
  });

  it('marks selected option with aria-pressed="true"', () => {
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={['opt-b']}
        onChange={vi.fn()}
      />
    );
    const parisBtn = screen.getByText('Paris').closest('button');
    expect(parisBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks non-selected options with aria-pressed="false"', () => {
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={['opt-b']}
        onChange={vi.fn()}
      />
    );
    const londonBtn = screen.getByText('London').closest('button');
    expect(londonBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('adds a selection in multi-select mode', () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceQuestion
        item={MULTI_SELECT}
        value={['opt-r']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Blue'));
    expect(onChange).toHaveBeenCalledWith(['opt-r', 'opt-b']);
  });

  it('removes an already-selected option in multi-select mode', () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceQuestion
        item={MULTI_SELECT}
        value={['opt-r', 'opt-b']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Red'));
    expect(onChange).toHaveBeenCalledWith(['opt-b']);
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={[]}
        onChange={onChange}
        disabled
      />
    );
    fireEvent.click(screen.getByText('Paris'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables all option buttons when disabled prop is set', () => {
    render(
      <MultipleChoiceQuestion
        item={SINGLE_SELECT}
        value={[]}
        onChange={vi.fn()}
        disabled
      />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('renders 4 option buttons for a 4-option question', () => {
    render(
      <MultipleChoiceQuestion
        item={MULTI_SELECT}
        value={[]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });
});
