import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextSubmissionForm } from './TextSubmissionForm';
import * as useSubmitAssignmentModule from '@/hooks/useSubmitAssignment';

vi.mock('@/hooks/useSubmitAssignment', () => ({
  useSubmitAssignment: vi.fn(),
}));

const mockSubmit = vi.fn();

const defaultHookReturn = {
  submit: mockSubmit,
  loading: false,
  error: null,
};

const defaultProps = {
  contentItemId: 'ci-1',
  courseId: 'c-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSubmitAssignmentModule.useSubmitAssignment).mockReturnValue(
    defaultHookReturn
  );
  mockSubmit.mockResolvedValue(null);
});

describe('TextSubmissionForm', () => {
  it('renders the "Your Answer" label', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    expect(screen.getByText('Your Answer')).toBeInTheDocument();
  });

  it('renders the textarea with correct placeholder', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/write your assignment response/i)
    ).toBeInTheDocument();
  });

  it('Submit button is disabled initially (no text)', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /submit assignment/i })
    ).toBeDisabled();
  });

  it('Submit button remains disabled with fewer than 10 words', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/write your assignment/i), {
      target: { value: 'Only nine words here which is not enough' },
    });
    expect(
      screen.getByRole('button', { name: /submit assignment/i })
    ).toBeDisabled();
  });

  it('Submit button is enabled when 10 or more words are entered', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/write your assignment/i), {
      target: {
        value: 'This is a test with exactly ten words total here',
      },
    });
    expect(
      screen.getByRole('button', { name: /submit assignment/i })
    ).not.toBeDisabled();
  });

  it('shows word count text', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/write your assignment/i), {
      target: { value: 'hello world' },
    });
    expect(screen.getByText(/2 words/i)).toBeInTheDocument();
  });

  it('shows minimum words hint when below threshold', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/write your assignment/i), {
      target: { value: 'too short' },
    });
    expect(screen.getByText(/minimum 10 required/i)).toBeInTheDocument();
  });

  it('shows characters remaining', () => {
    render(<TextSubmissionForm {...defaultProps} />);
    expect(screen.getByText(/50000 characters remaining/i)).toBeInTheDocument();
  });

  it('calls submit with the textarea value on form submission', async () => {
    const longText =
      'This is a sufficiently long response that has more than ten words total to pass validation';
    mockSubmit.mockResolvedValue({
      id: 'sub-1',
      contentItemId: 'ci-1',
      submittedAt: '',
      wordCount: 15,
    });
    render(<TextSubmissionForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/write your assignment/i), {
      target: { value: longText },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit assignment/i }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith(longText));
  });

  it('shows success state after submission', async () => {
    mockSubmit.mockResolvedValue({
      id: 'sub-1',
      contentItemId: 'ci-1',
      submittedAt: '',
      wordCount: 15,
    });
    render(<TextSubmissionForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/write your assignment/i), {
      target: {
        value:
          'This is a sufficiently long response that has more than ten words total',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit assignment/i }));
    await waitFor(() =>
      expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument()
    );
    expect(
      screen.getByText(/plagiarism check in progress/i)
    ).toBeInTheDocument();
  });

  it('calls onSubmitted callback with submission id', async () => {
    const onSubmitted = vi.fn();
    mockSubmit.mockResolvedValue({
      id: 'sub-42',
      contentItemId: 'ci-1',
      submittedAt: '',
      wordCount: 15,
    });
    render(<TextSubmissionForm {...defaultProps} onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByPlaceholderText(/write your assignment/i), {
      target: {
        value:
          'This is a sufficiently long response with more than ten words here',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit assignment/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('sub-42'));
  });

  it('shows error message when submission fails', () => {
    vi.mocked(useSubmitAssignmentModule.useSubmitAssignment).mockReturnValue({
      ...defaultHookReturn,
      error: 'Network error occurred',
    });
    render(<TextSubmissionForm {...defaultProps} />);
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('shows "Submitting…" text and disables button while loading', () => {
    vi.mocked(useSubmitAssignmentModule.useSubmitAssignment).mockReturnValue({
      ...defaultHookReturn,
      loading: true,
    });
    render(<TextSubmissionForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
  });
});
