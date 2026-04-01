import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/button', () => ({
  Button: (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={p.onClick} disabled={p.disabled} {...p}>
      {p.children}
    </button>
  ),
}));
vi.mock('@/components/ui/label', () => ({
  Label: (p: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...p} />,
}));
vi.mock('@/components/ui/slider', () => ({
  Slider: (p: { value?: number[]; onValueChange?: (v: number[]) => void }) => (
    <input
      type="range"
      data-testid="slider"
      value={p.value?.[0]}
      onChange={(e) => p.onValueChange?.([Number(e.target.value)])}
    />
  ),
}));
vi.mock('lucide-react', () => ({ PlusCircle: () => <span /> }));
vi.mock('./QuizQuestion', () => ({
  QuizQuestion: ({
    index,
    onRemove,
  }: {
    index: number;
    onRemove: () => void;
  }) => (
    <div data-testid={'quiz-q-' + index}>
      <button onClick={onRemove}>Remove</button>
    </div>
  ),
}));

import { QuizBuilderForm } from './QuizBuilderForm';

const Q = {
  type: 'MULTIPLE_CHOICE' as const,
  question: 'What?',
  choices: ['A', 'B', 'C', 'D'] as [string, string, string, string],
  correctIndex: 0,
};

describe('QuizBuilderForm', () => {
  it('renders existing questions', () => {
    render(
      <QuizBuilderForm questions={[Q]} passingScore={70} onChange={vi.fn()} />
    );
    expect(screen.getByTestId('quiz-q-0')).toBeInTheDocument();
  });

  it('adds a question when add clicked', () => {
    const onChange = vi.fn();
    render(
      <QuizBuilderForm questions={[Q]} passingScore={70} onChange={onChange} />
    );
    fireEvent.click(screen.getByText(/Add Question/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([Q, expect.any(Object)]),
      70
    );
  });
});
