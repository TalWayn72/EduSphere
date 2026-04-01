/**
 * MergeRequestCard component tests
 *
 * Verifies:
 *  1. Renders author name
 *  2. Renders course name
 *  3. Renders proposal content
 *  4. Renders description/reason
 *  5. Shows Pending badge
 *  6. Shows timestamp when present
 *  7. Approve button calls onApprove
 *  8. Reject button calls onReject
 *  9. Has correct data-testid
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MergeRequestCard } from './MergeRequestCard';
import type { MergeRequest } from '@/pages/InstructorMergeQueuePage';

const request: MergeRequest = {
  id: 'mr-1',
  annotationId: 'ann-1',
  content: 'This section refers to the Mishnah Berurah',
  description: 'Adding context for students',
  authorName: 'Shmuel Cohen',
  courseId: 'c1',
  courseName: 'Introduction to Halacha',
  contentTimestamp: 125,
  submittedAt: new Date(Date.now() - 3600000).toISOString(), // 1h ago
  status: 'pending',
};

describe('MergeRequestCard', () => {
  const defaultProps = {
    request,
    onApprove: vi.fn(),
    onReject: vi.fn(),
  };

  it('renders author name', () => {
    render(<MergeRequestCard {...defaultProps} />);
    expect(screen.getByText('Shmuel Cohen')).toBeInTheDocument();
  });

  it('renders course name', () => {
    render(<MergeRequestCard {...defaultProps} />);
    expect(screen.getByText('Introduction to Halacha')).toBeInTheDocument();
  });

  it('renders proposal content', () => {
    render(<MergeRequestCard {...defaultProps} />);
    expect(screen.getByTestId('proposal-content-mr-1')).toBeInTheDocument();
    expect(
      screen.getByText(/This section refers to the Mishnah Berurah/)
    ).toBeInTheDocument();
  });

  it('renders description/reason', () => {
    render(<MergeRequestCard {...defaultProps} />);
    expect(screen.getByText(/Adding context for students/)).toBeInTheDocument();
  });

  it('shows Pending badge', () => {
    render(<MergeRequestCard {...defaultProps} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows formatted timestamp', () => {
    render(<MergeRequestCard {...defaultProps} />);
    // 125 seconds = 2:05
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('shows time ago text', () => {
    render(<MergeRequestCard {...defaultProps} />);
    expect(screen.getByText('1h ago')).toBeInTheDocument();
  });

  it('does not show timestamp when absent', () => {
    const noTimestamp = { ...request, contentTimestamp: undefined };
    render(<MergeRequestCard {...defaultProps} request={noTimestamp} />);
    expect(screen.queryByText('2:05')).not.toBeInTheDocument();
  });

  it('calls onApprove when Approve clicked', () => {
    const onApprove = vi.fn();
    render(<MergeRequestCard {...defaultProps} onApprove={onApprove} />);
    fireEvent.click(screen.getByTestId('approve-btn-mr-1'));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when Reject clicked', () => {
    const onReject = vi.fn();
    render(<MergeRequestCard {...defaultProps} onReject={onReject} />);
    fireEvent.click(screen.getByTestId('reject-btn-mr-1'));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('has correct data-testid', () => {
    render(<MergeRequestCard {...defaultProps} />);
    expect(screen.getByTestId('merge-request-mr-1')).toBeInTheDocument();
  });

  it('shows "just now" for very recent submissions', () => {
    const recent = { ...request, submittedAt: new Date().toISOString() };
    render(<MergeRequestCard {...defaultProps} request={recent} />);
    expect(screen.getByText('just now')).toBeInTheDocument();
  });
});
