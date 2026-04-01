import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('urql', () => ({
  useQuery: vi.fn(),
}));
vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  AT_RISK_LEARNERS_QUERY: 'AT_RISK_LEARNERS_QUERY',
}));
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));
vi.mock('@/components/ui/button', () => ({
  Button: (props: Record<string, unknown>) => <button {...props} />,
}));

import { AtRiskLearnersPanel } from './AtRiskLearnersPanel';
import * as urql from 'urql';

const LEARNERS = [
  {
    learnerId: 'l1',
    courseId: 'c1',
    riskScore: 85,
    daysSinceLastActivity: 14,
    progressPercent: 20,
    riskFactors: [{ key: 'low_activity', description: 'Low activity' }],
  },
];

describe('AtRiskLearnersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as never);
    render(<AtRiskLearnersPanel courseId="c1" />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no learners', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { atRiskLearners: [] }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AtRiskLearnersPanel courseId="c1" />);
    expect(screen.getByText(/No at-risk learners/i)).toBeInTheDocument();
  });

  it('renders learner table when data available', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { atRiskLearners: LEARNERS }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<AtRiskLearnersPanel courseId="c1" />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });
});
