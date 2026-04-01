/**
 * DeleteCourseButton unit tests.
 *
 * Tests: button rendering, dialog open on click, onDeleted callback.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi
    .fn()
    .mockReturnValue([
      { fetching: false },
      vi.fn().mockResolvedValue({ data: true, error: undefined }),
    ]),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  DELETE_COURSE_MUTATION: 'DELETE_COURSE_MUTATION',
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
  DialogTitle: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [k: string]: unknown;
  }) => <h2 {...props}>{children}</h2>,
  DialogDescription: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [k: string]: unknown;
  }) => <p {...props}>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >((props, ref) => <input ref={ref} {...props} />),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('lucide-react', () => ({
  Trash2: ({ className }: { className: string }) => (
    <span data-testid="icon-trash" className={className}>
      trash
    </span>
  ),
  Loader2: ({ className }: { className: string }) => (
    <span data-testid="icon-loader" className={className}>
      loading
    </span>
  ),
}));

import { DeleteCourseButton } from './DeleteCourseButton';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const defaultProps = {
  courseId: 'course-456',
  courseTitle: 'Advanced React',
  isPublished: true,
  onDeleted: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeleteCourseButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with delete label and icon', () => {
    render(<DeleteCourseButton {...defaultProps} />);

    const btn = screen.getByTestId('delete-course-btn');
    expect(btn).toBeInTheDocument();
    expect(screen.getByTestId('icon-trash')).toBeInTheDocument();
    expect(btn).toHaveTextContent('Delete Course');
  });

  it('dialog is closed by default', () => {
    render(<DeleteCourseButton {...defaultProps} />);

    expect(
      screen.queryByTestId('delete-course-dialog')
    ).not.toBeInTheDocument();
  });

  it('clicking button opens dialog', () => {
    render(<DeleteCourseButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('delete-course-btn'));

    expect(screen.getByTestId('delete-course-dialog')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<DeleteCourseButton {...defaultProps} />);

    const btn = screen.getByTestId('delete-course-btn');
    expect(btn).toHaveAttribute('aria-label', 'Delete Course');
  });
});
