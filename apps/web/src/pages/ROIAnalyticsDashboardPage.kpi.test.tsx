import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiGrid, CostPerUser } from './ROIAnalyticsDashboardPage.kpi';

describe('KpiGrid', () => {
  const defaultProps = {
    yearlyActiveUsers: 1234,
    monthlyActiveUsers: 456,
    seatUtilizationPct: 68.42,
    plan: 'GROWTH',
  };

  it('renders without crashing', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByTestId('kpi-grid')).toBeInTheDocument();
  });

  it('shows yearly active users formatted with locale string', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByTestId('kpi-yau')).toHaveTextContent('1,234');
  });

  it('shows monthly active users formatted', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByTestId('kpi-mau')).toHaveTextContent('456');
  });

  it('shows seat utilization percentage with 1 decimal', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByTestId('kpi-utilization')).toHaveTextContent('68.4%');
  });

  it('shows current plan name', () => {
    render(<KpiGrid {...defaultProps} />);
    expect(screen.getByTestId('kpi-plan')).toHaveTextContent('GROWTH');
  });

  it('renders 4 KPI cards', () => {
    render(<KpiGrid {...defaultProps} />);
    const grid = screen.getByTestId('kpi-grid');
    expect(grid.children).toHaveLength(4);
  });
});

describe('CostPerUser', () => {
  it('calculates cost per user for paid plans', () => {
    render(<CostPerUser plan="STARTER" yearlyActiveUsers={100} />);
    // STARTER = $12,000 / 100 users = $120.00
    expect(screen.getByTestId('cost-per-user')).toHaveTextContent('$120.00');
  });

  it('shows "Contact for pricing" for ENTERPRISE plan', () => {
    render(<CostPerUser plan="ENTERPRISE" yearlyActiveUsers={500} />);
    expect(screen.getByTestId('cost-per-user')).toHaveTextContent('Contact for pricing');
  });

  it('shows "Contact for pricing" for PILOT plan (free)', () => {
    render(<CostPerUser plan="PILOT" yearlyActiveUsers={50} />);
    expect(screen.getByTestId('cost-per-user')).toHaveTextContent('Contact for pricing');
  });

  it('shows dash when yearlyActiveUsers is 0', () => {
    render(<CostPerUser plan="GROWTH" yearlyActiveUsers={0} />);
    expect(screen.getByTestId('cost-per-user')).toHaveTextContent('—');
  });

  it('shows plan name in the per-YAU label', () => {
    render(<CostPerUser plan="UNIVERSITY" yearlyActiveUsers={1000} />);
    expect(screen.getByTestId('cost-per-user')).toHaveTextContent('UNIVERSITY plan');
  });

  it('calculates GROWTH plan cost correctly', () => {
    render(<CostPerUser plan="GROWTH" yearlyActiveUsers={320} />);
    // GROWTH = $32,000 / 320 = $100.00
    expect(screen.getByTestId('cost-per-user')).toHaveTextContent('$100.00');
  });
});
