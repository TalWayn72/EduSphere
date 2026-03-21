/**
 * DeleteCourseDialog unit tests.
 *
 * Tests: rendering, typed confirmation, cancel, mutation success/error,
 * published vs draft warning text.
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
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  DELETE_COURSE_MUTATION: 'DELETE_COURSE_MUTATION',
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="mock-dialog">{children}</div> : null,
  DialogContent: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <h2 {...props}>{children}</h2>
  ),
  DialogDescription: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <p {...props}>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className: string }) => (
    <span data-testid="icon-loader" className={className}>loading</span>
  ),
}));

import { DeleteCourseDialog } from './DeleteCourseDialog';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: true, error: undefined });

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onDeleted: vi.fn(),
  courseId: 'course-123',
  courseTitle: 'Intro to Testing',
  isPublished: false,
};

function mockMutation(execute = NOOP_EXECUTE, fetching = false) {
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching },
    execute,
  ] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeleteCourseDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutation();
  });

  it('renders dialog with correct title and description', () => {
    render(<DeleteCourseDialog {...defaultProps} />);

    expect(screen.getAllByText('Delete Course').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('delete-course-dialog')).toBeInTheDocument();
  });

  it('delete button is disabled initially', () => {
    render(<DeleteCourseDialog {...defaultProps} />);

    const deleteBtn = screen.getByTestId('delete-course-confirm-btn');
    expect(deleteBtn).toBeDisabled();
  });

  it('delete button enabled after typing correct title', () => {
    render(<DeleteCourseDialog {...defaultProps} />);

    const input = screen.getByTestId('delete-course-confirm-input');
    fireEvent.change(input, { target: { value: 'Intro to Testing' } });

    const deleteBtn = screen.getByTestId('delete-course-confirm-btn');
    expect(deleteBtn).not.toBeDisabled();
  });

  it('delete button stays disabled with wrong text', () => {
    render(<DeleteCourseDialog {...defaultProps} />);

    const input = screen.getByTestId('delete-course-confirm-input');
    fireEvent.change(input, { target: { value: 'wrong title' } });

    const deleteBtn = screen.getByTestId('delete-course-confirm-btn');
    expect(deleteBtn).toBeDisabled();
  });

  it('cancel button calls onClose', () => {
    render(<DeleteCourseDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId('delete-course-cancel-btn'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('successful mutation triggers hard navigation to /courses (BUG-103)', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ data: true, error: undefined });
    mockMutation(mockExecute);

    // Mock window.location.href setter to verify hard navigation
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);
    const hrefSetter = vi.fn();
    Object.defineProperty(window.location, 'href', {
      set: hrefSetter,
      configurable: true,
    });

    render(<DeleteCourseDialog {...defaultProps} />);

    const input = screen.getByTestId('delete-course-confirm-input');
    fireEvent.change(input, { target: { value: 'Intro to Testing' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-course-confirm-btn'));
    });

    expect(mockExecute).toHaveBeenCalledWith({ id: 'course-123' });
    // BUG-103: onDeleted is no longer called — instead window.location.href
    // triggers a hard navigation to bypass urql graphcache stale data
    expect(hrefSetter).toHaveBeenCalledWith('/courses');

    locationSpy.mockRestore();
  });

  it('error displays inline in dialog', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Server error', graphQLErrors: [] },
    });
    mockMutation(mockExecute);

    render(<DeleteCourseDialog {...defaultProps} />);

    const input = screen.getByTestId('delete-course-confirm-input');
    fireEvent.change(input, { target: { value: 'Intro to Testing' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-course-confirm-btn'));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to delete course. Please try again.');
    });
  });

  it('permission error shows permission denied message', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Forbidden',
        graphQLErrors: [{ message: 'permission denied' }],
      },
    });
    mockMutation(mockExecute);

    render(<DeleteCourseDialog {...defaultProps} />);

    const input = screen.getByTestId('delete-course-confirm-input');
    fireEvent.change(input, { target: { value: 'Intro to Testing' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-course-confirm-btn'));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("You don't have permission to delete this course.");
    });
  });

  it('published course shows published warning', () => {
    render(<DeleteCourseDialog {...defaultProps} isPublished={true} />);

    expect(screen.getByText('This course is currently published. Deleting it will remove access for all enrolled students.')).toBeInTheDocument();
  });

  it('draft course shows draft warning', () => {
    render(<DeleteCourseDialog {...defaultProps} isPublished={false} />);

    expect(screen.getByText('This course is a draft. Deleting it will remove all modules and content items.')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<DeleteCourseDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId('delete-course-dialog')).not.toBeInTheDocument();
  });
});
