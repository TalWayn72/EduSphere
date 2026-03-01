import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { AnalyticsCharts } from './CourseAnalyticsPage.charts';
import type {
  ContentItemMetric,
  FunnelStep,
} from './CourseAnalyticsPage';

// Mock Recharts — ResponsiveContainer uses ResizeObserver which is absent in JSDOM
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const MOCK_METRICS: ContentItemMetric[] = [
  {
    contentItemId: 'ci-1',
    title: 'Introduction to React',
    viewCount: 150,
    avgTimeSpentSeconds: 600,
    completionRate: 85,
  },
  {
    contentItemId: 'ci-2',
    title: 'Advanced TypeScript Patterns and Best Practices',
    viewCount: 80,
    avgTimeSpentSeconds: 900,
    completionRate: 60,
  },
];

const MOCK_FUNNEL: FunnelStep[] = [
  {
    moduleId: 'm1',
    moduleName: 'Module 1: Basics',
    learnersStarted: 100,
    learnersCompleted: 80,
    dropOffRate: 20,
  },
  {
    moduleId: 'm2',
    moduleName: 'Module 2: Advanced JavaScript Concepts',
    learnersStarted: 80,
    learnersCompleted: 50,
    dropOffRate: 37.5,
  },
];

describe('AnalyticsCharts', () => {
  it('renders "Content Item Views" card when metrics are provided', () => {
    render(
      <AnalyticsCharts
        contentItemMetrics={MOCK_METRICS}
        dropOffFunnel={MOCK_FUNNEL}
      />
    );
    expect(screen.getByText('Content Item Views')).toBeInTheDocument();
  });

  it('shows "No content item data yet" when metrics array is empty', () => {
    render(
      <AnalyticsCharts contentItemMetrics={[]} dropOffFunnel={MOCK_FUNNEL} />
    );
    expect(
      screen.getByText('No content item data yet.')
    ).toBeInTheDocument();
    expect(screen.getByText('Content Engagement')).toBeInTheDocument();
  });

  it('renders "Module Drop-off Funnel" card when funnel data is provided', () => {
    render(
      <AnalyticsCharts
        contentItemMetrics={MOCK_METRICS}
        dropOffFunnel={MOCK_FUNNEL}
      />
    );
    expect(
      screen.getAllByText('Module Drop-off Funnel')
    ).toHaveLength(1);
  });

  it('shows "No funnel data yet" when funnel array is empty', () => {
    render(
      <AnalyticsCharts contentItemMetrics={MOCK_METRICS} dropOffFunnel={[]} />
    );
    expect(screen.getByText('No funnel data yet.')).toBeInTheDocument();
  });

  it('renders both charts as grid when both data sets are provided', () => {
    render(
      <AnalyticsCharts
        contentItemMetrics={MOCK_METRICS}
        dropOffFunnel={MOCK_FUNNEL}
      />
    );
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
  });

  it('renders bar charts inside responsive containers', () => {
    render(
      <AnalyticsCharts
        contentItemMetrics={MOCK_METRICS}
        dropOffFunnel={MOCK_FUNNEL}
      />
    );
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(2);
  });

  it('shows both empty states when both data sets are empty', () => {
    render(<AnalyticsCharts contentItemMetrics={[]} dropOffFunnel={[]} />);
    expect(
      screen.getByText('No content item data yet.')
    ).toBeInTheDocument();
    expect(screen.getByText('No funnel data yet.')).toBeInTheDocument();
  });
});
