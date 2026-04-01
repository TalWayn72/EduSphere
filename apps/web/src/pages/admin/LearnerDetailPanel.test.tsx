import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn() };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { LearnerDetailPanel } from './LearnerDetailPanel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(learner?: Record<string, unknown>, fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: learner ? { learnerDetail: learner } : undefined,
      fetching,
      error: undefined,
    },
  ] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LearnerDetailPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not render when closed', () => {
    setupMocks();
    render(<LearnerDetailPanel userId="u1" open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    setupMocks(undefined, true);
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('shows skeleton when fetching', () => {
    setupMocks(undefined, true);
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows learner stats when data loaded', () => {
    setupMocks({
      userId: 'u1',
      email: 'student@test.com',
      name: 'Alice Doe',
      coursesEnrolled: 5,
      coursesCompleted: 3,
      avgQuizScore: 85.5,
      totalLearningHours: 42.3,
      activityTimeline: [],
    });
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByText('42.3')).toBeInTheDocument();
  });

  it('shows learner name in dialog title', () => {
    setupMocks({
      userId: 'u1',
      email: 'x@y.com',
      name: 'Bob Smith',
      coursesEnrolled: 0,
      coursesCompleted: 0,
      avgQuizScore: 0,
      totalLearningHours: 0,
      activityTimeline: [],
    });
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('shows learner email', () => {
    setupMocks({
      userId: 'u1',
      email: 'student@example.com',
      name: 'Test',
      coursesEnrolled: 0,
      coursesCompleted: 0,
      avgQuizScore: 0,
      totalLearningHours: 0,
      activityTimeline: [],
    });
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
  });

  it('shows activity timeline entries', () => {
    setupMocks({
      userId: 'u1',
      email: 'x@y.com',
      name: 'Test',
      coursesEnrolled: 1,
      coursesCompleted: 1,
      avgQuizScore: 90,
      totalLearningHours: 10,
      activityTimeline: [
        {
          date: '2026-03-01T00:00:00Z',
          type: 'QUIZ',
          description: 'Passed quiz on React',
        },
      ],
    });
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Passed quiz on React')).toBeInTheDocument();
    expect(screen.getByText('QUIZ')).toBeInTheDocument();
  });

  it('shows no activity message when timeline is empty', () => {
    setupMocks({
      userId: 'u1',
      email: 'x@y.com',
      name: 'Test',
      coursesEnrolled: 0,
      coursesCompleted: 0,
      avgQuizScore: 0,
      totalLearningHours: 0,
      activityTimeline: [],
    });
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('shows not-found message when learner is null', () => {
    setupMocks(undefined, false);
    render(<LearnerDetailPanel userId="u1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Learner not found')).toBeInTheDocument();
  });
});
