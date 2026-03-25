/**
 * ExamItemReviewCard component tests
 *
 * Verifies:
 *  1. Renders question text
 *  2. Shows domain and bloom badges
 *  3. Shows multiple choice options with correct marks
 *  4. Shows fallback for non-multiple-choice items
 *  5. Approve/Edit/Reject buttons fire callbacks
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExamItemReviewCard } from './ExamItemReviewCard';
import type { MultipleChoice } from '@/types/quiz';

const mcItem: MultipleChoice = {
  type: 'MULTIPLE_CHOICE',
  question: 'What is the capital of France?',
  options: [
    { id: 'a', text: 'London' },
    { id: 'b', text: 'Paris' },
    { id: 'c', text: 'Berlin' },
  ],
  correctOptionIds: ['b'],
};

const baseProps = {
  item: {
    domainTag: 'Geography',
    bloomLevel: 'REMEMBER' as const,
    questionData: mcItem,
  },
  index: 0,
  onApprove: vi.fn(),
  onEdit: vi.fn(),
  onReject: vi.fn(),
};

describe('ExamItemReviewCard', () => {
  it('renders question text', () => {
    render(<ExamItemReviewCard {...baseProps} />);
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });

  it('shows domain badge', () => {
    render(<ExamItemReviewCard {...baseProps} />);
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });

  it('shows bloom level badge', () => {
    render(<ExamItemReviewCard {...baseProps} />);
    // Bloom level appears in badge and in the mono text
    const bloomElements = screen.getAllByText('REMEMBER');
    expect(bloomElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders multiple choice options', () => {
    render(<ExamItemReviewCard {...baseProps} />);
    expect(screen.getByText(/London/)).toBeInTheDocument();
    expect(screen.getByText(/Paris/)).toBeInTheDocument();
    expect(screen.getByText(/Berlin/)).toBeInTheDocument();
  });

  it('shows fallback for non-multiple-choice type', () => {
    const dragItem = {
      ...baseProps,
      item: {
        ...baseProps.item,
        questionData: {
          type: 'DRAG_ORDER' as const,
          question: 'Order these',
          items: [],
          correctOrder: [],
        },
      },
    };
    render(<ExamItemReviewCard {...dragItem} />);
    expect(screen.getByText(/DRAG_ORDER — preview not available/)).toBeInTheDocument();
  });

  it('calls onApprove with index when Approve clicked', () => {
    const onApprove = vi.fn();
    render(<ExamItemReviewCard {...baseProps} onApprove={onApprove} />);
    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledWith(0);
  });

  it('calls onEdit with index when Edit clicked', () => {
    const onEdit = vi.fn();
    render(<ExamItemReviewCard {...baseProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(0);
  });

  it('calls onReject with index when Reject clicked', () => {
    const onReject = vi.fn();
    render(<ExamItemReviewCard {...baseProps} onReject={onReject} />);
    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith(0);
  });

  it('has correct data-testid', () => {
    render(<ExamItemReviewCard {...baseProps} index={3} />);
    expect(screen.getByTestId('review-card-3')).toBeInTheDocument();
  });
});
