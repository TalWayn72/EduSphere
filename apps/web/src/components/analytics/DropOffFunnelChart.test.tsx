import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Recharts mock ─────────────────────────────────────────────────────────────
// ResponsiveContainer uses ResizeObserver which is absent in JSDOM — always mock.

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'bar' }, children),
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  Cell: ({ fill }: { fill: string }) =>
    React.createElement('div', { 'data-testid': 'bar-cell', 'data-fill': fill }),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { DropOffFunnelChart } from './DropOffFunnelChart';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DropOffFunnelChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bar chart when data is provided', () => {
    const data = [
      { moduleName: 'Module 1', dropOffRate: 10 },
      { moduleName: 'Module 2', dropOffRate: 55 },
    ];
    render(<DropOffFunnelChart data={data} />);
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('renders a Cell for each data point', () => {
    const data = [
      { moduleName: 'Module 1', dropOffRate: 10 },
      { moduleName: 'Module 2', dropOffRate: 55 },
    ];
    render(<DropOffFunnelChart data={data} />);
    const cells = screen.getAllByTestId('bar-cell');
    expect(cells.length).toBe(2);
  });

  it('shows empty state message when data is empty', () => {
    render(<DropOffFunnelChart data={[]} />);
    expect(screen.getByText('No funnel data available.')).toBeDefined();
  });

  it('does NOT render bar chart when data is empty', () => {
    render(<DropOffFunnelChart data={[]} />);
    expect(screen.queryByTestId('bar-chart')).toBeNull();
  });

  it('assigns red fill for drop-off rate above 50', () => {
    const data = [{ moduleName: 'High Risk', dropOffRate: 75 }];
    render(<DropOffFunnelChart data={data} />);
    const cell = screen.getByTestId('bar-cell');
    expect(cell.getAttribute('data-fill')).toBe('#EF4444');
  });

  it('assigns amber fill for drop-off rate between 25 and 50', () => {
    const data = [{ moduleName: 'Medium Risk', dropOffRate: 35 }];
    render(<DropOffFunnelChart data={data} />);
    const cell = screen.getByTestId('bar-cell');
    expect(cell.getAttribute('data-fill')).toBe('#F59E0B');
  });

  it('assigns green fill for drop-off rate below 25', () => {
    const data = [{ moduleName: 'Low Risk', dropOffRate: 10 }];
    render(<DropOffFunnelChart data={data} />);
    const cell = screen.getByTestId('bar-cell');
    expect(cell.getAttribute('data-fill')).toBe('#10B981');
  });
});
