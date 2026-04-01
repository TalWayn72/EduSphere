/**
 * ExamQuestionRenderer component tests
 *
 * Verifies:
 *  1.  Renders MCQ for MULTIPLE_CHOICE type
 *  2.  Shows question number badge
 *  3.  Shows flag button and toggles text
 *  4.  Calls onAnswer when answer selected
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/quiz/MultipleChoiceQuestion', () => ({
  MultipleChoiceQuestion: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ onChange }: any) => (
      <div data-testid="mc-question">
        <button onClick={() => onChange(['opt-a'])}>Pick A</button>
      </div>
    )
  ),
}));

vi.mock('@/components/quiz/DragOrderQuestion', () => ({
  DragOrderQuestion: vi.fn(() => <div data-testid="drag-order-question" />),
}));

vi.mock('@/components/quiz/HotspotQuestion', () => ({
  HotspotQuestion: vi.fn(() => <div data-testid="hotspot-question" />),
}));

vi.mock('@/components/quiz/MatchingQuestion', () => ({
  MatchingQuestion: vi.fn(() => <div data-testid="matching-question" />),
}));

vi.mock('@/components/quiz/FillBlankQuestion', () => ({
  FillBlankQuestion: vi.fn(() => <div data-testid="fill-blank-question" />),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { ExamQuestionRenderer } from './ExamQuestionRenderer';
import type { QuizItem } from '@/types/quiz';

// ── Fixtures ────────────────────────────────────────────────────────────────

const MC_ITEM: QuizItem = {
  type: 'MULTIPLE_CHOICE',
  question: 'What is 2+2?',
  options: [
    { id: 'opt-a', text: '3' },
    { id: 'opt-b', text: '4' },
  ],
  correctOptionIds: ['opt-b'],
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ExamQuestionRenderer', () => {
  it('renders MultipleChoiceQuestion for MC type', () => {
    render(
      <ExamQuestionRenderer
        questionNumber={1}
        totalQuestions={10}
        questionData={MC_ITEM}
        answer={null}
        onAnswer={vi.fn()}
        flagged={false}
        onToggleFlag={vi.fn()}
      />
    );
    expect(screen.getByTestId('mc-question')).toBeInTheDocument();
  });

  it('shows question number badge', () => {
    render(
      <ExamQuestionRenderer
        questionNumber={3}
        totalQuestions={10}
        questionData={MC_ITEM}
        answer={null}
        onAnswer={vi.fn()}
        flagged={false}
        onToggleFlag={vi.fn()}
      />
    );
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
  });

  it('shows "Flag for Review" when not flagged', () => {
    render(
      <ExamQuestionRenderer
        questionNumber={1}
        totalQuestions={5}
        questionData={MC_ITEM}
        answer={null}
        onAnswer={vi.fn()}
        flagged={false}
        onToggleFlag={vi.fn()}
      />
    );
    expect(screen.getByText('Flag for Review')).toBeInTheDocument();
  });

  it('shows "Flagged" when flagged=true', () => {
    render(
      <ExamQuestionRenderer
        questionNumber={1}
        totalQuestions={5}
        questionData={MC_ITEM}
        answer={null}
        onAnswer={vi.fn()}
        flagged={true}
        onToggleFlag={vi.fn()}
      />
    );
    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });

  it('calls onToggleFlag when flag button clicked', () => {
    const onToggleFlag = vi.fn();
    render(
      <ExamQuestionRenderer
        questionNumber={1}
        totalQuestions={5}
        questionData={MC_ITEM}
        answer={null}
        onAnswer={vi.fn()}
        flagged={false}
        onToggleFlag={onToggleFlag}
      />
    );
    fireEvent.click(screen.getByText('Flag for Review'));
    expect(onToggleFlag).toHaveBeenCalledTimes(1);
  });

  it('calls onAnswer when child question triggers onChange', () => {
    const onAnswer = vi.fn();
    render(
      <ExamQuestionRenderer
        questionNumber={1}
        totalQuestions={5}
        questionData={MC_ITEM}
        answer={null}
        onAnswer={onAnswer}
        flagged={false}
        onToggleFlag={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Pick A'));
    expect(onAnswer).toHaveBeenCalledWith(['opt-a']);
  });
});
