/**
 * DeleteCourseButton unit tests.
 *
 * Tests: button rendering, dialog open on click, onDeleted callback,
 * disabled state (canDelete=false), tooltip when disabled,
 * dialog does NOT open when disabled.
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

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-root">{children}</div>
  ),
  TooltipTrigger: ({
    children,
    asChild: _asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    [k: string]: unknown;
  }) => (
    <div data-testid="tooltip-trigger" {...props}>
      {children}
    </div>
  ),
  TooltipContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <div data-testid="tooltip-content" {...props}>
      {children}
    </div>
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

  it('clicking button opens dialog when canDelete=true', () => {
    render(<DeleteCourseButton {...defaultProps} canDelete={true} />);

    fireEvent.click(screen.getByTestId('delete-course-btn'));

    expect(screen.getByTestId('delete-course-dialog')).toBeInTheDocument();
  });

  it('clicking button opens dialog when canDelete prop is omitted (default true)', () => {
    render(<DeleteCourseButton {...defaultProps} />);

    fireEvent.click(screen.getByTestId('delete-course-btn'));

    expect(screen.getByTestId('delete-course-dialog')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<DeleteCourseButton {...defaultProps} />);

    const btn = screen.getByTestId('delete-course-btn');
    expect(btn).toHaveAttribute('aria-label', 'Delete Course');
  });

  describe('when canDelete=false', () => {
    it('button is disabled', () => {
      render(<DeleteCourseButton {...defaultProps} canDelete={false} />);

      const btn = screen.getByTestId('delete-course-btn');
      expect(btn).toBeDisabled();
    });

    it('button has aria-disabled attribute', () => {
      render(<DeleteCourseButton {...defaultProps} canDelete={false} />);

      const btn = screen.getByTestId('delete-course-btn');
      expect(btn).toHaveAttribute('aria-disabled', 'true');
    });

    it('tooltip is rendered with permission message', () => {
      render(<DeleteCourseButton {...defaultProps} canDelete={false} />);

      expect(screen.getByTestId('tooltip-root')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-content')).toHaveTextContent(
        "You don't have permission to delete this course."
      );
    });

    it('dialog does NOT open when disabled button is clicked', () => {
      render(<DeleteCourseButton {...defaultProps} canDelete={false} />);

      // Button is disabled so click should not open dialog
      fireEvent.click(screen.getByTestId('delete-course-btn'));

      expect(
        screen.queryByTestId('delete-course-dialog')
      ).not.toBeInTheDocument();
    });

    it('no tooltip rendered when canDelete=true', () => {
      render(<DeleteCourseButton {...defaultProps} canDelete={true} />);

      expect(screen.queryByTestId('tooltip-root')).not.toBeInTheDocument();
    });
  });
});
