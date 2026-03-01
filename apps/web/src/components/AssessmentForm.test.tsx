import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { AssessmentForm } from './AssessmentForm';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/assessment.queries', () => ({
  SUBMIT_RESPONSE_MUTATION: 'SUBMIT_RESPONSE_MUTATION',
}));

const mockSubmit = vi.fn();

const CRITERIA = [
  { id: 'c1', label: 'Communication' },
  { id: 'c2', label: 'Teamwork' },
];

const defaultProps = {
  campaignId: 'camp-1',
  raterRole: 'PEER' as const,
  criteria: CRITERIA,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSubmit.mockResolvedValue({ data: { submitResponse: { id: 'r1' } }, error: undefined });
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false, error: undefined } as never,
    mockSubmit as never,
  ]);
});

describe('AssessmentForm', () => {
  it('renders "Submit Your Feedback" heading', () => {
    render(<AssessmentForm {...defaultProps} />);
    expect(screen.getByText('Submit Your Feedback')).toBeInTheDocument();
  });

  it('shows the rater role', () => {
    render(<AssessmentForm {...defaultProps} />);
    expect(screen.getByText(/peer/i)).toBeInTheDocument();
  });

  it('renders a radiogroup for each criteria', () => {
    render(<AssessmentForm {...defaultProps} />);
    expect(screen.getByRole('radiogroup', { name: 'Communication' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Teamwork' })).toBeInTheDocument();
  });

  it('renders 5 star radio buttons per criteria', () => {
    render(<AssessmentForm {...defaultProps} />);
    const commGroup = screen.getByRole('radiogroup', { name: 'Communication' });
    const radios = commGroup.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(5);
  });

  it('Submit button is disabled when not all criteria are rated', () => {
    render(<AssessmentForm {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /submit feedback/i })
    ).toBeDisabled();
  });

  it('Submit button enabled after rating all criteria', () => {
    render(<AssessmentForm {...defaultProps} />);
    // Rate criteria 1 with 3 stars (first occurrence)
    fireEvent.click(screen.getAllByLabelText('3 stars')[0]!);
    // Rate criteria 2 with 4 stars (second occurrence)
    fireEvent.click(screen.getAllByLabelText('4 stars')[1]!);
    expect(
      screen.getByRole('button', { name: /submit feedback/i })
    ).not.toBeDisabled();
  });

  it('renders the narrative textarea', () => {
    render(<AssessmentForm {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/share any additional observations/i)
    ).toBeInTheDocument();
  });

  it('calls submit mutation with campaignId, raterRole, and criteriaScores after rating all', async () => {
    render(<AssessmentForm {...defaultProps} />);
    fireEvent.click(screen.getAllByLabelText('3 stars')[0]!);
    fireEvent.click(screen.getAllByLabelText('4 stars')[1]!);
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'camp-1',
        raterRole: 'PEER',
      })
    );
  });

  it('shows success state after successful submission', async () => {
    render(<AssessmentForm {...defaultProps} />);
    fireEvent.click(screen.getAllByLabelText('5 stars')[0]!);
    fireEvent.click(screen.getAllByLabelText('5 stars')[1]!);
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/your feedback has been submitted/i)
      ).toBeInTheDocument()
    );
  });

  it('calls onSubmitted callback on success', async () => {
    const onSubmitted = vi.fn();
    render(<AssessmentForm {...defaultProps} onSubmitted={onSubmitted} />);
    fireEvent.click(screen.getAllByLabelText('5 stars')[0]!);
    fireEvent.click(screen.getAllByLabelText('5 stars')[1]!);
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  });

  it('shows error message when mutation returns an error', () => {
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        error: { message: 'Submission failed' } as never,
      } as never,
      mockSubmit as never,
    ]);
    render(<AssessmentForm {...defaultProps} />);
    expect(screen.getByText('Submission failed')).toBeInTheDocument();
  });
});
