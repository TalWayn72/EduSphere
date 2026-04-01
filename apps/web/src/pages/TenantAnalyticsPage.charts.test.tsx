import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mock recharts ─────────────────────────────────────────────────────────────

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { TenantAnalyticsCharts } from './TenantAnalyticsPage.charts';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TenantAnalyticsCharts', () => {
  const defaultProps = {
    activeLearnersTrend: [
      { date: '2026-01', value: 100 },
      { date: '2026-02', value: 120 },
    ],
    completionRateTrend: [
      { date: '2026-01', value: 45 },
      { date: '2026-02', value: 52 },
    ],
    topCourses: [
      {
        courseId: 'c1',
        courseTitle: 'Intro to AI',
        enrollmentCount: 150,
        completionRate: 0.72,
        avgTimeToCompleteHours: 12.5,
      },
      {
        courseId: 'c2',
        courseTitle: 'Data Science',
        enrollmentCount: 90,
        completionRate: 0.65,
        avgTimeToCompleteHours: 20.3,
      },
    ],
  };

  it('renders active learners trend card title', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('Active Learners Trend')).toBeInTheDocument();
  });

  it('renders completion rate trend card title', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('Completion Rate Trend (%)')).toBeInTheDocument();
  });

  it('renders top courses table title', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('Top Courses')).toBeInTheDocument();
  });

  it('renders AreaChart and LineChart', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders course titles in the table', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('Intro to AI')).toBeInTheDocument();
    expect(screen.getByText('Data Science')).toBeInTheDocument();
  });

  it('formats completion rate as percentage', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('72.0%')).toBeInTheDocument();
    expect(screen.getByText('65.0%')).toBeInTheDocument();
  });

  it('formats avg time with 1 decimal and "h" suffix', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('12.5h')).toBeInTheDocument();
    expect(screen.getByText('20.3h')).toBeInTheDocument();
  });

  it('shows enrollment counts', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('shows empty state when no courses', () => {
    render(<TenantAnalyticsCharts {...defaultProps} topCourses={[]} />);
    expect(screen.getByText('No course data available.')).toBeInTheDocument();
  });

  it('renders accessible table with aria-label', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(
      screen.getByRole('table', { name: /top courses table/i })
    ).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<TenantAnalyticsCharts {...defaultProps} />);
    expect(screen.getByText('Course')).toBeInTheDocument();
    expect(screen.getByText('Enrollments')).toBeInTheDocument();
    expect(screen.getByText('Completion %')).toBeInTheDocument();
    expect(screen.getByText('Avg Hours')).toBeInTheDocument();
  });
});
