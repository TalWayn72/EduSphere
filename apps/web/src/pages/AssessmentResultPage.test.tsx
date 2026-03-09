import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as urql from 'urql';
import { AssessmentResultPage } from './AssessmentResultPage';

vi.mock('urql', async () => ({
  ...(await vi.importActual('urql')),
  useQuery: vi.fn(),
}));

// Mock recharts for the embedded RadarChart
vi.mock('recharts', () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
}));

const NOOP_QUERY = [{ data: undefined, fetching: false, error: undefined }, vi.fn()] as never;

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/assessments/c1/results']}>
      <Routes>
        <Route path="/assessments/:id/results" element={<AssessmentResultPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AssessmentResultPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
  });

  it('renders Assessment Results heading', () => {
    renderWithRoute();
    expect(
      screen.getByRole('heading', { name: /Assessment Results/i })
    ).toBeInTheDocument();
  });

  it('shows no-results empty state when data is undefined', () => {
    renderWithRoute();
    expect(screen.getByText(/No results yet/i)).toBeInTheDocument();
  });

  it('does not expose raw technical error strings', () => {
    renderWithRoute();
    expect(screen.queryByText(/\[Network\]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();
  });
});
