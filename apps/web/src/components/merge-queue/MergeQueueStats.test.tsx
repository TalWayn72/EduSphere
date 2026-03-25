/**
 * MergeQueueStats component tests (StatsBar + ResolvedList)
 *
 * Verifies:
 *  1. StatsBar shows pending count
 *  2. StatsBar shows approved count
 *  3. StatsBar shows rejected count
 *  4. ResolvedList returns null when empty
 *  5. ResolvedList renders resolved items
 *  6. ResolvedList shows correct status badge
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsBar, ResolvedList } from './MergeQueueStats';
import type { MergeRequest } from '@/pages/InstructorMergeQueuePage';

const requests: MergeRequest[] = [
  { id: '1', annotationId: 'a1', content: 'Note 1', description: 'desc', authorName: 'Alice', courseId: 'c1', courseName: 'Math', submittedAt: '2026-01-01T00:00:00Z', status: 'pending' },
  { id: '2', annotationId: 'a2', content: 'Note 2', description: 'desc', authorName: 'Bob', courseId: 'c1', courseName: 'Math', submittedAt: '2026-01-01T00:00:00Z', status: 'pending' },
  { id: '3', annotationId: 'a3', content: 'Note 3', description: 'desc', authorName: 'Carol', courseId: 'c1', courseName: 'Math', submittedAt: '2026-01-01T00:00:00Z', status: 'approved' },
  { id: '4', annotationId: 'a4', content: 'Note 4', description: 'desc', authorName: 'Dave', courseId: 'c1', courseName: 'Math', submittedAt: '2026-01-01T00:00:00Z', status: 'rejected' },
];

describe('StatsBar', () => {
  it('shows pending count', () => {
    render(<StatsBar requests={requests} />);
    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('shows approved count', () => {
    render(<StatsBar requests={requests} />);
    expect(screen.getByText('1 approved')).toBeInTheDocument();
  });

  it('shows rejected count', () => {
    render(<StatsBar requests={requests} />);
    expect(screen.getByText('1 rejected')).toBeInTheDocument();
  });

  it('shows zero counts with empty list', () => {
    render(<StatsBar requests={[]} />);
    expect(screen.getByText('0 pending')).toBeInTheDocument();
    expect(screen.getByText('0 approved')).toBeInTheDocument();
    expect(screen.getByText('0 rejected')).toBeInTheDocument();
  });
});

describe('ResolvedList', () => {
  it('returns null when empty', () => {
    const { container } = render(<ResolvedList resolved={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders resolved items', () => {
    const resolved = requests.filter((r) => r.status !== 'pending');
    render(<ResolvedList resolved={resolved} />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByTestId('resolved-3')).toBeInTheDocument();
    expect(screen.getByTestId('resolved-4')).toBeInTheDocument();
  });

  it('shows author name for resolved items', () => {
    const resolved = requests.filter((r) => r.status !== 'pending');
    render(<ResolvedList resolved={resolved} />);
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Dave')).toBeInTheDocument();
  });

  it('shows status badge text', () => {
    const resolved = requests.filter((r) => r.status !== 'pending');
    render(<ResolvedList resolved={resolved} />);
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('shows content preview', () => {
    const resolved = [requests[2]];
    render(<ResolvedList resolved={resolved} />);
    expect(screen.getByText('Note 3')).toBeInTheDocument();
  });
});
