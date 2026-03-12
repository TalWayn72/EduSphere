/**
 * AssessmentResultsDetailPage tests — Phase 60 (360° Multi-Rater Assessments).
 * 4 test cases covering loading, error, and data rendering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as urql from 'urql';
import AssessmentResultsDetailPage from './AssessmentResultsDetailPage';

vi.mock('urql', async () => ({
  ...(await vi.importActual('urql')),
  useQuery: vi.fn(),
}));

vi.mock('recharts', () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="radar-chart">{children}</div>
  ),
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Legend: () => null,
  Tooltip: () => null,
}));

const FETCHING_STATE = [
  { data: undefined, fetching: true, error: undefined },
  vi.fn(),
] as never;

const ERROR_STATE = [
  {
    data: undefined,
    fetching: false,
    error: new Error('Network error'),
  },
  vi.fn(),
] as never;

const DATA_STATE = [
  {
    data: {
      assessmentCampaign: {
        id: 'camp-1',
        title: 'Annual 360 Review',
        status: 'COMPLETED',
        rubricCriteria: [
          { id: 'c1', name: 'Communication', weight: 1, maxScore: 5 },
          { id: 'c2', name: 'Leadership', weight: 1, maxScore: 5 },
        ],
        raterGroups: [
          {
            raterType: 'SELF',
            scores: [
              { criterionId: 'c1', score: 4.0 },
              { criterionId: 'c2', score: 3.5 },
            ],
          },
          {
            raterType: 'PEER',
            scores: [
              { criterionId: 'c1', score: 4.5 },
              { criterionId: 'c2', score: 4.0 },
            ],
          },
        ],
      },
    },
    fetching: false,
    error: undefined,
  },
  vi.fn(),
] as never;

function renderWithRoute(state: never = DATA_STATE) {
  vi.mocked(urql.useQuery).mockReturnValue(state);
  return render(
    <MemoryRouter initialEntries={['/assessments/camp-1/results-detail']}>
      <Routes>
        <Route
          path="/assessments/:id/results-detail"
          element={<AssessmentResultsDetailPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('AssessmentResultsDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton while fetching', () => {
    renderWithRoute(FETCHING_STATE);
    // aria-busy indicates loading state
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('renders error state when query fails', () => {
    renderWithRoute(ERROR_STATE);
    expect(
      screen.getByText(/Unable to load assessment results/i)
    ).toBeInTheDocument();
  });

  it('renders h1 with campaign title when data loads', () => {
    renderWithRoute(DATA_STATE);
    expect(
      screen.getByRole('heading', { name: /Annual 360 Review/i, level: 1 })
    ).toBeInTheDocument();
  });

  it('renders table with criteria names', () => {
    renderWithRoute(DATA_STATE);
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Leadership')).toBeInTheDocument();
  });
});
