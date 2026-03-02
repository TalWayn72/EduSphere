import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizResultView } from './QuizResultView';
import type { QuizResult, QuizContent } from '@/types/quiz';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_QUIZ: QuizContent = {
  passingScore: 70,
  showExplanations: false,
  randomizeOrder: false,
  items: [
    {
      type: 'MULTIPLE_CHOICE',
      question: 'What is 2+2?',
      options: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' },
      ],
      correctOptionIds: ['b'],
    },
    {
      type: 'MULTIPLE_CHOICE',
      question: 'What is the capital of France?',
      options: [
        { id: 'c', text: 'London' },
        { id: 'd', text: 'Paris' },
      ],
      correctOptionIds: ['d'],
    },
  ],
};

const PASSED_RESULT: QuizResult = {
  id: 'res-1',
  score: 85,
  passed: true,
  itemResults: [
    { itemIndex: 0, correct: true },
    { itemIndex: 1, correct: true },
  ],
  submittedAt: '2026-02-20T10:00:00Z',
};

const FAILED_RESULT: QuizResult = {
  id: 'res-2',
  score: 50,
  passed: false,
  itemResults: [
    { itemIndex: 0, correct: true },
    {
      itemIndex: 1,
      correct: false,
      explanation: 'Paris is the capital of France.',
    },
  ],
  submittedAt: '2026-02-20T11:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuizResultView', () => {
  it('shows "Congratulations!" when quiz is passed', () => {
    render(
      <QuizResultView
        result={PASSED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
  });

  it('shows "Not quite — keep going!" when quiz is failed', () => {
    render(
      <QuizResultView
        result={FAILED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('Not quite — keep going!')).toBeInTheDocument();
  });

  it('renders the score as a percentage', () => {
    render(
      <QuizResultView
        result={PASSED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows the failing score', () => {
    render(
      <QuizResultView
        result={FAILED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders the passing score threshold', () => {
    render(
      <QuizResultView
        result={PASSED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('Passing score: 70%')).toBeInTheDocument();
  });

  it('renders "Try Again" button', () => {
    render(
      <QuizResultView
        result={PASSED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('calls onRetry when "Try Again" is clicked', () => {
    const onRetry = vi.fn();
    render(
      <QuizResultView
        result={PASSED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does NOT show question review when showExplanations is false', () => {
    render(
      <QuizResultView
        result={PASSED_RESULT}
        quiz={MOCK_QUIZ}
        onRetry={vi.fn()}
      />
    );
    expect(screen.queryByText('Question Review')).not.toBeInTheDocument();
  });

  it('shows question review when showExplanations is true', () => {
    const quizWithExplanations = { ...MOCK_QUIZ, showExplanations: true };
    render(
      <QuizResultView
        result={FAILED_RESULT}
        quiz={quizWithExplanations}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('Question Review')).toBeInTheDocument();
  });

  it('shows question text in review when showExplanations is true', () => {
    const quizWithExplanations = { ...MOCK_QUIZ, showExplanations: true };
    render(
      <QuizResultView
        result={FAILED_RESULT}
        quiz={quizWithExplanations}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(
      screen.getByText('What is the capital of France?')
    ).toBeInTheDocument();
  });

  it('shows explanation text for incorrect answers when showExplanations is true', () => {
    const quizWithExplanations = { ...MOCK_QUIZ, showExplanations: true };
    render(
      <QuizResultView
        result={FAILED_RESULT}
        quiz={quizWithExplanations}
        onRetry={vi.fn()}
      />
    );
    expect(
      screen.getByText('Paris is the capital of France.')
    ).toBeInTheDocument();
  });
});
