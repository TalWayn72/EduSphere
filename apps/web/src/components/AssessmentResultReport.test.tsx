import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { AssessmentResultReport } from './AssessmentResultReport';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/graphql/assessment.queries', () => ({
  ASSESSMENT_RESULT_QUERY: 'ASSESSMENT_RESULT_QUERY',
}));

const MOCK_RESULT = {
  campaignId: 'c-1',
  summary: 'Strong performer across all dimensions.',
  generatedAt: '2026-01-15T10:00:00Z',
  aggregatedScores: [
    {
      criteriaId: 'cr1',
      label: 'Communication',
      selfScore: 4.0,
      peerAvg: 3.8,
      managerScore: 4.2,
      overallAvg: 4.0,
    },
    {
      criteriaId: 'cr2',
      label: 'Teamwork',
      selfScore: 3.5,
      peerAvg: 4.0,
      managerScore: null,
      overallAvg: 3.75,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AssessmentResultReport', () => {
  it('shows loading state when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getByText(/loading results/i)).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Network error' },
      },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows "no results" message when result is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { assessmentResult: null }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getByText(/no results available yet/i)).toBeInTheDocument();
  });

  it('renders "360° Assessment Results" heading when data loaded', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { assessmentResult: MOCK_RESULT },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getByText('360° Assessment Results')).toBeInTheDocument();
  });

  it('shows the summary text', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { assessmentResult: MOCK_RESULT },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(
      screen.getByText('Strong performer across all dimensions.')
    ).toBeInTheDocument();
  });

  it('renders criteria labels', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { assessmentResult: MOCK_RESULT },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Teamwork')).toBeInTheDocument();
  });

  it('shows overall score badges for each criteria', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { assessmentResult: MOCK_RESULT },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getByText('4.0/5')).toBeInTheDocument();
    expect(screen.getByText('3.8/5')).toBeInTheDocument();
  });

  it('shows self/peer/manager score bars', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { assessmentResult: MOCK_RESULT },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getAllByText('Self').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Peer avg').length).toBeGreaterThanOrEqual(1);
    // Manager null for Teamwork — only one Manager bar
    expect(screen.getAllByText('Manager').length).toBeGreaterThanOrEqual(1);
  });

  it('shows generated date', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { assessmentResult: MOCK_RESULT },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<AssessmentResultReport campaignId="c-1" />);
    expect(screen.getByText(/generated:/i)).toBeInTheDocument();
  });
});
