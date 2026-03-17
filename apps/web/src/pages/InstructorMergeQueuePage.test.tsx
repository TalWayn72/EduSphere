import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InstructorMergeQueuePage } from './InstructorMergeQueuePage';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const MOCK_PROPOSALS = [
  {
    id: 'mr-1', annotationId: 'ann-42', content: 'Maimonides uses overflow',
    description: 'Important insight', authorName: 'David Ben-Ami',
    courseId: 'course-1', courseName: 'Jewish Philosophy 101',
    contentTimestamp: 1245, submittedAt: new Date().toISOString(), status: 'pending',
  },
  {
    id: 'mr-2', annotationId: 'ann-17', content: 'Kantian imperative parallels',
    description: 'Cross-course connection', authorName: 'Miriam Cohen',
    courseId: 'course-2', courseName: 'Early Modern Philosophy',
    submittedAt: new Date().toISOString(), status: 'pending',
  },
  {
    id: 'mr-3', annotationId: 'ann-91', content: 'Compatibilism in Frankfurt cases',
    description: 'Useful clarification', authorName: 'Yonatan Levi',
    courseId: 'course-2', courseName: 'Early Modern Philosophy',
    contentTimestamp: 720, submittedAt: new Date().toISOString(), status: 'pending',
  },
];

const mockReexecute = vi.fn();
const mockApproveFn = vi.fn().mockResolvedValue({ data: {} });
const mockRejectFn = vi.fn().mockResolvedValue({ data: {} });

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQuery: vi.fn(() => [
      { fetching: false, data: { pendingAnnotationProposals: MOCK_PROPOSALS }, error: undefined },
      mockReexecute,
    ]),
    useMutation: vi.fn((doc: unknown) => {
      if (String(doc).includes('approve')) return [{ fetching: false }, mockApproveFn];
      return [{ fetching: false }, mockRejectFn];
    }),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('courseId=course-1'), vi.fn()],
  };
});

import * as urql from 'urql';

function resetUrqlMock() {
  vi.mocked(urql.useQuery).mockReturnValue([
    { fetching: false, data: { pendingAnnotationProposals: MOCK_PROPOSALS }, error: undefined },
    mockReexecute,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <InstructorMergeQueuePage />
    </MemoryRouter>
  );
}

describe('InstructorMergeQueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUrqlMock();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Annotation Proposals')).toBeInTheDocument();
  });

  it('shows pending count correctly', () => {
    renderPage();
    expect(screen.getByText(/3 pending/i)).toBeInTheDocument();
  });

  it('renders all 3 pending requests', () => {
    renderPage();
    const queue = screen.getByTestId('merge-queue-list');
    const proposalDivs = queue.querySelectorAll('[data-testid^="proposal-content-"]');
    expect(proposalDivs.length).toBe(3);
  });

  it('shows the proposed annotation content', () => {
    renderPage();
    expect(document.body.textContent).toContain('overflow');
  });

  it('shows empty state when no proposals', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: { pendingAnnotationProposals: [] }, error: undefined },
      mockReexecute,
    ] as never);
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('does not expose raw errors or stack traces', () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/TypeError|Error:/);
    expect(document.body.textContent).not.toMatch(/at\s+\w+\s*\(/);
  });

  it('renders inside Layout', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('shows course name in each request', () => {
    renderPage();
    expect(screen.getAllByText('Jewish Philosophy 101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Early Modern Philosophy').length).toBeGreaterThan(0);
  });
});
