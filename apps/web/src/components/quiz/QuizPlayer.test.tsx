import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useGradeQuiz', () => ({
  useGradeQuiz: vi.fn(() => ({
    gradeQuiz: vi.fn().mockResolvedValue(null),
    loading: false,
  })),
}));

vi.mock('./MultipleChoiceQuestion', () => ({
  MultipleChoiceQuestion: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ item, onChange }: any) => (
      <div data-testid="mc-question">
        <span>{item.question}</span>
        <button onClick={() => onChange(['opt-a'])}>Select A</button>
      </div>
    )
  ),
}));

vi.mock('./DragOrderQuestion', () => ({
  DragOrderQuestion: vi.fn(() => <div data-testid="drag-order-question" />),
}));

vi.mock('./HotspotQuestion', () => ({
  HotspotQuestion: vi.fn(() => <div data-testid="hotspot-question" />),
}));

vi.mock('./MatchingQuestion', () => ({
  MatchingQuestion: vi.fn(() => <div data-testid="matching-question" />),
}));

vi.mock('./LikertQuestion', () => ({
  LikertQuestion: vi.fn(() => <div data-testid="likert-question" />),
}));

vi.mock('./FillBlankQuestion', () => ({
  FillBlankQuestion: vi.fn(() => <div data-testid="fill-blank-question" />),
}));

vi.mock('./QuizResultView', () => ({
  QuizResultView: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ result, onRetry }: any) => (
      <div data-testid="quiz-result-view">
        <span data-testid="result-score">{result.score}%</span>
        <button onClick={onRetry}>Try Again</button>
      </div>
    )
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { QuizPlayer } from './QuizPlayer';
import * as useGradeQuizModule from '@/hooks/useGradeQuiz';
import type { QuizContent } from '@/types/quiz';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_QUIZ: QuizContent = {
  passingScore: 70,
  showExplanations: false,
  randomizeOrder: false,
  items: [
    {
      type: 'MULTIPLE_CHOICE',
      question: 'Question One?',
      options: [
        { id: 'opt-a', text: 'Option A' },
        { id: 'opt-b', text: 'Option B' },
      ],
      correctOptionIds: ['opt-a'],
    },
    {
      type: 'MULTIPLE_CHOICE',
      question: 'Question Two?',
      options: [
        { id: 'opt-c', text: 'Option C' },
        { id: 'opt-d', text: 'Option D' },
      ],
      correctOptionIds: ['opt-c'],
    },
  ],
};

const MOCK_GRADE_RESULT = {
  id: 'res-1',
  score: 80,
  passed: true,
  itemResults: [
    { itemIndex: 0, correct: true },
    { itemIndex: 1, correct: true },
  ],
  submittedAt: '2026-02-20T10:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuizPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGradeQuizModule.useGradeQuiz).mockReturnValue({
      gradeQuiz: vi.fn().mockResolvedValue(null),
      loading: false,
      error: null,
    });
  });

  it('renders first question on initial load', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    expect(screen.getByText('Question One?')).toBeInTheDocument();
  });

  it('shows "Question 1 of 2" progress indicator', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  it('shows "50%" progress percentage for first of two questions', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('"Previous" button is disabled on the first question', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    expect(
      screen.getByRole('button', { name: /previous/i })
    ).toBeDisabled();
  });

  it('shows "Next" button (not "Submit Quiz") on first question', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    expect(
      screen.getByRole('button', { name: /next/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit quiz/i })
    ).not.toBeInTheDocument();
  });

  it('advances to next question when "Next" is clicked', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Question Two?')).toBeInTheDocument();
  });

  it('shows "Submit Quiz" on the last question', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(
      screen.getByRole('button', { name: /submit quiz/i })
    ).toBeInTheDocument();
  });

  it('"Previous" button is enabled on the second question', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(
      screen.getByRole('button', { name: /previous/i })
    ).not.toBeDisabled();
  });

  it('goes back to previous question when "Previous" is clicked', () => {
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByText('Question One?')).toBeInTheDocument();
  });

  it('shows QuizResultView after successful submission', async () => {
    const gradeQuiz = vi.fn().mockResolvedValue(MOCK_GRADE_RESULT);
    vi.mocked(useGradeQuizModule.useGradeQuiz).mockReturnValue({
      gradeQuiz,
      loading: false,
      error: null,
    });
    render(<QuizPlayer quizContent={MOCK_QUIZ} contentItemId="item-1" />);
    // Navigate to last question
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /submit quiz/i }));
    // Wait for async grade
    await vi.waitFor(() => {
      expect(screen.getByTestId('quiz-result-view')).toBeInTheDocument();
    });
    expect(screen.getByTestId('result-score').textContent).toBe('80%');
  });
});
