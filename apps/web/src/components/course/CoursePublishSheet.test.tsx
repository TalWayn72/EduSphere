/**
 * CoursePublishSheet unit tests — Phase 65.
 *
 * Tests: readiness checklist rendering, pass/fail icons, publish button
 * enable/disable logic, confirmation dialog, urql mock patterns.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
  DialogContent: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; asChild?: boolean }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  CheckCircle2: ({ className }: { className: string }) => (
    <span data-testid="icon-check" className={className}>check</span>
  ),
  XCircle: ({ className }: { className: string }) => (
    <span data-testid="icon-x" className={className}>x</span>
  ),
  Loader2: ({ className }: { className: string }) => (
    <span data-testid="icon-loader" className={className}>loading</span>
  ),
  Send: ({ className }: { className: string }) => (
    <span data-testid="icon-send" className={className}>send</span>
  ),
}));

import { CoursePublishSheet } from './CoursePublishSheet';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ALL_PASS_CHECKS = [
  { name: 'has_title', passed: true, message: null },
  { name: 'has_description', passed: true, message: null },
  { name: 'has_lessons', passed: true, message: null },
  { name: 'lessons_ready', passed: true, message: null },
  { name: 'has_pipeline_results', passed: true, message: null },
];

const SOME_FAIL_CHECKS = [
  { name: 'has_title', passed: true, message: null },
  { name: 'has_description', passed: false, message: 'חסר תיאור' },
  { name: 'has_lessons', passed: true, message: null },
  { name: 'lessons_ready', passed: false, message: 'שיעור 2 לא מוכן' },
  { name: 'has_pipeline_results', passed: true, message: null },
];

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });
const NOOP_MUTATION = [{ fetching: false }, NOOP_EXECUTE] as never;

function makeReadinessQuery(checks: typeof ALL_PASS_CHECKS, ready: boolean) {
  return [
    {
      data: { courseReadiness: { ready, checks } },
      fetching: false,
      error: undefined,
    },
    vi.fn(),
  ] as never;
}

function makeLoadingQuery() {
  return [
    { data: undefined, fetching: true, error: undefined },
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

describe('CoursePublishSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders readiness checklist when open', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    expect(screen.getByText('פרסום קורס')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /readiness checks/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('shows pass icons for passing checks', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    const checkIcons = screen.getAllByTestId('icon-check');
    expect(checkIcons).toHaveLength(5);
    expect(screen.queryByTestId('icon-x')).not.toBeInTheDocument();
  });

  it('shows fail icons and messages for failing checks', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(SOME_FAIL_CHECKS, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    const failIcons = screen.getAllByTestId('icon-x');
    expect(failIcons).toHaveLength(2);
    expect(screen.getByText('חסר תיאור')).toBeInTheDocument();
    expect(screen.getByText('שיעור 2 לא מוכן')).toBeInTheDocument();
  });

  it('shows Hebrew labels for known checks', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    expect(screen.getByText('כותרת קורס')).toBeInTheDocument();
    expect(screen.getByText('תיאור קורס')).toBeInTheDocument();
    expect(screen.getByText('לפחות שיעור אחד')).toBeInTheDocument();
    expect(screen.getByText('כל השיעורים מוכנים')).toBeInTheDocument();
    expect(screen.getByText('תוצאות Pipeline')).toBeInTheDocument();
  });

  it('shows pass/fail badge text', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(SOME_FAIL_CHECKS, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    const passLabels = screen.getAllByText('עבר');
    const failLabels = screen.getAllByText('נכשל');
    expect(passLabels).toHaveLength(3);
    expect(failLabels).toHaveLength(2);
  });

  it('publish button disabled when not all checks pass', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(SOME_FAIL_CHECKS, false)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    const publishBtn = screen.getByTestId('publish-btn');
    expect(publishBtn).toBeDisabled();
  });

  it('publish button enabled when all checks pass', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    const publishBtn = screen.getByTestId('publish-btn');
    expect(publishBtn).not.toBeDisabled();
  });

  it('confirmation dialog appears on publish click', async () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );
    render(<CoursePublishSheet {...defaultProps} />);

    fireEvent.click(screen.getByTestId('publish-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('publish-confirm-dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('אישור פרסום')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-publish-btn')).toBeInTheDocument();
  });

  it('confirming publish calls mutation and callbacks', async () => {
    const mockPublish = vi.fn().mockResolvedValue({
      data: { publishCourse: { id: 'course-123', isPublished: true } },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockPublish,
    ] as never);
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );

    render(<CoursePublishSheet {...defaultProps} />);

    fireEvent.click(screen.getByTestId('publish-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-publish-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-publish-btn'));
    });

    expect(mockPublish).toHaveBeenCalledWith({ id: 'course-123' });
    expect(defaultProps.onPublished).toHaveBeenCalled();
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading spinner while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeLoadingQuery());
    render(<CoursePublishSheet {...defaultProps} />);

    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('does not render when open is false', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );
    render(<CoursePublishSheet {...defaultProps} open={false} />);

    expect(screen.queryByText('פרסום קורס')).not.toBeInTheDocument();
  });

  it('shows publish error message', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeReadinessQuery(ALL_PASS_CHECKS, true)
    );
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false, error: { message: 'שגיאה בפרסום' } },
      vi.fn(),
    ] as never);
    render(<CoursePublishSheet {...defaultProps} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/failed to save/i);
  });
});
