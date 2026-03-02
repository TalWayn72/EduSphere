import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MicrolessonCard, type MicrolessonData } from './MicrolessonCard';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_LESSON: MicrolessonData = {
  id: 'lesson-1',
  conceptName: 'Python Basics',
  objective: 'Understand list comprehensions',
  body: 'List comprehensions provide a concise way to create lists.',
  durationSeconds: 120,
};

const MOCK_LESSON_WITH_QUIZ: MicrolessonData = {
  ...MOCK_LESSON,
  id: 'lesson-quiz',
  quizQuestion: {
    question: 'Which is a valid list comprehension?',
    options: [
      { text: '[x for x in range(5)]', isCorrect: true },
      { text: '(x in range(5) for x)', isCorrect: false },
    ],
    explanation: 'Square brackets create a list.',
  },
};

function renderCard(
  overrides: Partial<MicrolessonData> = {},
  props: {
    currentIndex?: number;
    totalCount?: number;
    onPrevious?: () => void;
    onNext?: () => void;
    onComplete?: (id: string) => void;
    isCompleted?: boolean;
  } = {}
) {
  const lesson = { ...MOCK_LESSON, ...overrides };
  return render(
    <MicrolessonCard
      lesson={lesson}
      currentIndex={props.currentIndex ?? 0}
      totalCount={props.totalCount ?? 3}
      onPrevious={props.onPrevious}
      onNext={props.onNext}
      onComplete={props.onComplete}
      isCompleted={props.isCompleted}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MicrolessonCard', () => {
  it('displays the concept name', () => {
    renderCard();
    expect(screen.getByText('Python Basics')).toBeInTheDocument();
  });

  it('displays the lesson objective', () => {
    renderCard();
    expect(
      screen.getByText('Understand list comprehensions')
    ).toBeInTheDocument();
  });

  it('displays the lesson body text', () => {
    renderCard();
    expect(
      screen.getByText(/list comprehensions provide a concise way/i)
    ).toBeInTheDocument();
  });

  it('formats duration in minutes (120s → "2m")', () => {
    renderCard();
    expect(screen.getByText('2m')).toBeInTheDocument();
  });

  it('formats duration with seconds (90s → "1m 30s")', () => {
    renderCard({ durationSeconds: 90 });
    expect(screen.getByText('1m 30s')).toBeInTheDocument();
  });

  it('renders progress dots with correct aria-label', () => {
    renderCard({}, { currentIndex: 1, totalCount: 3 });
    expect(screen.getByLabelText('Lesson 2 of 3')).toBeInTheDocument();
  });

  it('Prev button is disabled at index 0', () => {
    renderCard({}, { currentIndex: 0, onPrevious: vi.fn() });
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  it('Prev button is enabled when currentIndex > 0', () => {
    renderCard({}, { currentIndex: 1, totalCount: 3, onPrevious: vi.fn() });
    expect(screen.getByRole('button', { name: /prev/i })).not.toBeDisabled();
  });

  it('Next button disabled at last index', () => {
    renderCard({}, { currentIndex: 2, totalCount: 3, onNext: vi.fn() });
    // At last index without isCompleted → "Mark Complete" renders instead of Next
    expect(
      screen.getByRole('button', { name: /mark complete/i })
    ).toBeInTheDocument();
  });

  it('Next button rendered and enabled when not at last index', () => {
    renderCard({}, { currentIndex: 0, totalCount: 3, onNext: vi.fn() });
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('calls onPrevious when Prev is clicked', () => {
    const onPrev = vi.fn();
    renderCard({}, { currentIndex: 1, totalCount: 3, onPrevious: onPrev });
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it('calls onNext when Next is clicked', () => {
    const onNext = vi.fn();
    renderCard({}, { currentIndex: 0, totalCount: 3, onNext });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('calls onComplete with lesson id when Mark Complete is clicked', () => {
    const onComplete = vi.fn();
    renderCard(
      { id: 'lesson-1' },
      { currentIndex: 2, totalCount: 3, onComplete }
    );
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));
    expect(onComplete).toHaveBeenCalledWith('lesson-1');
  });

  it('shows completed checkmark when isCompleted=true', () => {
    const { container } = renderCard({}, { isCompleted: true });
    // CheckCircle renders as an SVG
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    // isCompleted adds a green-500 class to the CheckCircle
    const greenSvg = Array.from(svgs).find((svg) =>
      svg.getAttribute('class')?.includes('text-green-500')
    );
    expect(greenSvg).toBeDefined();
  });

  it('shows quiz question when quizQuestion is provided', () => {
    render(
      <MicrolessonCard
        lesson={MOCK_LESSON_WITH_QUIZ}
        currentIndex={0}
        totalCount={1}
      />
    );
    expect(screen.getByText(/quick check:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/which is a valid list comprehension/i)
    ).toBeInTheDocument();
  });

  it('quiz options are rendered', () => {
    render(
      <MicrolessonCard
        lesson={MOCK_LESSON_WITH_QUIZ}
        currentIndex={0}
        totalCount={1}
      />
    );
    expect(screen.getByText('[x for x in range(5)]')).toBeInTheDocument();
  });

  it('quiz explanation appears after selecting an option', () => {
    render(
      <MicrolessonCard
        lesson={MOCK_LESSON_WITH_QUIZ}
        currentIndex={0}
        totalCount={1}
      />
    );
    fireEvent.click(screen.getByText('[x for x in range(5)]'));
    expect(
      screen.getByText('Square brackets create a list.')
    ).toBeInTheDocument();
  });
});
