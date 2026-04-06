/**
 * CoursePublishSheet — click-to-fix navigation tests.
 * Split from CoursePublishSheet.test.tsx to keep each file ≤ 300 lines.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  COURSE_READINESS_QUERY: 'COURSE_READINESS_QUERY',
  PUBLISH_COURSE_MUTATION: 'PUBLISH_COURSE_MUTATION',
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="mock-dialog">{children}</div> : null,
  DialogContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [k: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    asChild?: boolean;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="icon-check">check</span>,
  XCircle: () => <span data-testid="icon-x">x</span>,
  Loader2: () => <span data-testid="icon-loader">loading</span>,
  Send: () => <span data-testid="icon-send">send</span>,
  ArrowRight: () => <span data-testid="icon-arrow-right">→</span>,
}));

import { CoursePublishSheet } from './CoursePublishSheet';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SOME_FAIL_CHECKS = [
  { name: 'has_title', passed: true, message: null },
  { name: 'has_description', passed: false, message: 'חסר תיאור' },
  { name: 'has_lessons', passed: true, message: null },
  { name: 'lessons_ready', passed: false, message: 'שיעור 2 לא מוכן' },
  { name: 'has_pipeline_results', passed: true, message: null },
];

const NOOP_MUTATION = [
  { fetching: false },
  vi.fn().mockResolvedValue({ data: null, error: undefined }),
] as never;

function makeReadinessQuery(checks: typeof SOME_FAIL_CHECKS, ready: boolean) {
  return [
    {
      data: { courseReadiness: { ready, checks } },
      fetching: false,
      error: undefined,
    },
    vi.fn(),
  ] as never;
}

const defaultProps = {
  courseId: 'course-123',
  open: true,
  onOpenChange: vi.fn(),
  onPublished: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CoursePublishSheet — click-to-fix navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('failed checks render as clickable buttons', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(SOME_FAIL_CHECKS, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    expect(screen.getByTestId('check-has_description').tagName).toBe('BUTTON');
    expect(screen.getByTestId('check-lessons_ready').tagName).toBe('BUTTON');
  });

  it('passed checks remain non-clickable divs', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(SOME_FAIL_CHECKS, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    expect(screen.getByTestId('check-has_title').tagName).toBe('DIV');
    expect(screen.getByTestId('check-has_lessons').tagName).toBe('DIV');
    expect(screen.getByTestId('check-has_pipeline_results').tagName).toBe(
      'DIV'
    );
  });

  it('clicking a failed check closes sheet and navigates to correct URL', async () => {
    vi.useFakeTimers();
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(SOME_FAIL_CHECKS, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    fireEvent.click(screen.getByTestId('check-has_description'));

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-123/edit?tab=info&focus=description'
    );

    vi.useRealTimers();
  });

  it('clicking has_title check navigates to info tab with title focus', async () => {
    vi.useFakeTimers();
    const ALL_FAIL = SOME_FAIL_CHECKS.map((c) =>
      c.name === 'has_title' ? { ...c, passed: false } : c
    );
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_FAIL, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    fireEvent.click(screen.getByTestId('check-has_title'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-123/edit?tab=info&focus=title'
    );

    vi.useRealTimers();
  });

  it('clicking lessons_ready check navigates to modules tab', async () => {
    vi.useFakeTimers();
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(SOME_FAIL_CHECKS, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    fireEvent.click(screen.getByTestId('check-lessons_ready'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-123/edit?tab=modules'
    );

    vi.useRealTimers();
  });
});
