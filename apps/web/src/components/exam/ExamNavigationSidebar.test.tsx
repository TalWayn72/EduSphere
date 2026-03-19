/**
 * ExamNavigationSidebar component tests
 *
 * Verifies:
 *  1.  Renders correct number of question buttons
 *  2.  Shows answered questions as green
 *  3.  Shows flagged questions as orange
 *  4.  Shows current question with ring styling
 *  5.  Click navigates to question via onGoTo
 *  6.  Shows legend items
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExamNavigationSidebar } from './ExamNavigationSidebar';

const IDS = ['q1', 'q2', 'q3', 'q4', 'q5'];

function renderSidebar(overrides: Partial<Parameters<typeof ExamNavigationSidebar>[0]> = {}) {
  const defaults = {
    totalQuestions: 5,
    currentIndex: 0,
    answeredIds: new Set<string>(),
    flaggedIds: new Set<string>(),
    questionItemIds: IDS,
    onGoTo: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
  };
  return render(<ExamNavigationSidebar {...defaults} {...overrides} />);
}

describe('ExamNavigationSidebar', () => {
  it('renders one button per question', () => {
    renderSidebar();
    const buttons = screen.getAllByRole('button', { name: /question \d/i });
    expect(buttons).toHaveLength(5);
  });

  it('marks answered questions with green class', () => {
    renderSidebar({ answeredIds: new Set(['q2']) });
    const btn = screen.getByLabelText('Question 2 (answered)');
    expect(btn.className).toContain('green');
  });

  it('marks flagged questions with orange class', () => {
    renderSidebar({ flaggedIds: new Set(['q3']) });
    const btn = screen.getByLabelText('Question 3 (flagged)');
    expect(btn.className).toContain('orange');
  });

  it('marks current question with ring styling', () => {
    renderSidebar({ currentIndex: 1 });
    const btn = screen.getByLabelText('Question 2');
    expect(btn.getAttribute('aria-current')).toBe('step');
    expect(btn.className).toContain('ring');
  });

  it('calls onGoTo with correct index when button clicked', () => {
    const onGoTo = vi.fn();
    renderSidebar({ onGoTo });

    fireEvent.click(screen.getByLabelText('Question 4'));
    expect(onGoTo).toHaveBeenCalledWith(3);
  });

  it('renders legend items', () => {
    renderSidebar();
    expect(screen.getByText('Unanswered')).toBeInTheDocument();
    expect(screen.getByText('Answered')).toBeInTheDocument();
    expect(screen.getByText('Flagged')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('shows Submit Exam button', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /submit exam/i })).toBeInTheDocument();
  });

  it('disables Submit Exam button while submitting', () => {
    renderSidebar({ isSubmitting: true });
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
  });
});
