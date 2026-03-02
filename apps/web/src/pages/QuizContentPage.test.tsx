import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks (hoisted by vitest) ─────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ contentId: 'content-1' })),
  };
});

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => children,
}));

vi.mock('@/components/ContentViewerBreadcrumb', () => ({
  ContentViewerBreadcrumb: vi.fn(() => null),
}));

vi.mock('@/components/quiz/QuizPlayer', () => ({
  QuizPlayer: vi.fn(() => null),
}));

vi.mock('@/hooks/useQuizContent', () => ({
  useQuizContent: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { QuizContentPage } from './QuizContentPage';
import { useQuizContent } from '@/hooks/useQuizContent';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_RESULT = {
  isQuiz: false,
  quizContent: null,
  title: '',
  fetching: false,
  error: null,
};

const MOCK_QUIZ_CONTENT = {
  title: 'Test Quiz',
  questions: [
    {
      id: 'q1',
      text: 'What is 2+2?',
      options: ['3', '4', '5'],
      correctIndex: 1,
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuizContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuizContent).mockReturnValue(BASE_RESULT);
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(useQuizContent).mockReturnValue({
      ...BASE_RESULT,
      fetching: true,
    });
    const { container } = render(<QuizContentPage />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('does not show skeleton when not fetching', () => {
    const { container } = render(<QuizContentPage />);
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('shows error message when error occurs', () => {
    vi.mocked(useQuizContent).mockReturnValue({
      ...BASE_RESULT,
      error: 'Network error',
    });
    render(<QuizContentPage />);
    expect(
      screen.getByText(/failed to load quiz.*network error/i)
    ).toBeInTheDocument();
  });

  it('shows "not a quiz" message when content type is not QUIZ', () => {
    vi.mocked(useQuizContent).mockReturnValue({
      ...BASE_RESULT,
      isQuiz: false,
    });
    render(<QuizContentPage />);
    expect(
      screen.getByText(/this content item is not a quiz/i)
    ).toBeInTheDocument();
  });

  it('renders QuizPlayer when isQuiz and quizContent are both truthy', () => {
    vi.mocked(useQuizContent).mockReturnValue({
      ...BASE_RESULT,
      isQuiz: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      quizContent: MOCK_QUIZ_CONTENT as any,
    });
    render(<QuizContentPage />);
    expect(vi.mocked(QuizPlayer)).toHaveBeenCalledWith(
      expect.objectContaining({ contentItemId: 'content-1' }),
      undefined
    );
  });

  it('shows "Quiz data is missing" when isQuiz but quizContent is null', () => {
    vi.mocked(useQuizContent).mockReturnValue({
      ...BASE_RESULT,
      isQuiz: true,
      quizContent: null,
    });
    render(<QuizContentPage />);
    expect(screen.getByText(/quiz data is missing/i)).toBeInTheDocument();
  });

  it('passes contentId to useQuizContent hook', () => {
    render(<QuizContentPage />);
    expect(vi.mocked(useQuizContent)).toHaveBeenCalledWith('content-1');
  });

  it('does not show error message when fetching (loading takes priority)', () => {
    vi.mocked(useQuizContent).mockReturnValue({
      ...BASE_RESULT,
      fetching: true,
      error: 'some error',
    });
    render(<QuizContentPage />);
    // The error section only renders when !fetching
    expect(screen.queryByText(/failed to load quiz/i)).not.toBeInTheDocument();
  });
});
