import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AssessmentRadarChart from './RadarChart';

// Mock recharts — SVG rendering is unreliable in jsdom
vi.mock('recharts', () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: ({ dataKey }: { dataKey: string }) => <span>{dataKey}</span>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
}));

const criteria = [
  { name: 'Collaboration', score: 4, maxScore: 5 },
  { name: 'Communication', score: 3, maxScore: 5 },
  { name: 'Technical', score: 5, maxScore: 5 },
];

describe('AssessmentRadarChart', () => {
  it('renders without crashing', () => {
    render(<AssessmentRadarChart criteria={criteria} ariaLabel="Assessment radar chart" />);
  });

  it('has aria-label for accessibility', () => {
    render(<AssessmentRadarChart criteria={criteria} ariaLabel="Assessment results" />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Assessment results');
  });

  it('uses default aria-label when not provided', () => {
    render(<AssessmentRadarChart criteria={criteria} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Assessment radar chart');
  });
});
