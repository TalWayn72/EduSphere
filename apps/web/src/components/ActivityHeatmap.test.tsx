import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityHeatmap } from './ActivityHeatmap';
import type { DailyActivity } from '@/lib/mock-analytics';

const makeData = (count: number, startDate = '2024-01-01'): DailyActivity[] => {
  const result: DailyActivity[] = [];
  const base = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push({
      date: d.toISOString().split('T')[0]!,
      count: i % 10,
    });
  }
  return result;
};

describe('ActivityHeatmap', () => {
  it('renders without crashing with 84 days of data', () => {
    const data = makeData(84);
    const { container } = render(<ActivityHeatmap data={data} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows study days count in the summary', () => {
    const data = makeData(7).map((d, i) => ({ ...d, count: i === 0 ? 0 : 3 }));
    render(<ActivityHeatmap data={data} />);
    // 6 days have count > 0 → 6 study days
    expect(screen.getByText(/6 study days/)).toBeInTheDocument();
  });

  it('shows total sessions in the summary', () => {
    // count values: 0,1,2,3,4,5,6 → total = 21
    const data = makeData(7);
    render(<ActivityHeatmap data={data} />);
    expect(screen.getByText(/21 total study sessions/)).toBeInTheDocument();
  });

  it('renders "Less" and "More" legend labels', () => {
    const data = makeData(7);
    render(<ActivityHeatmap data={data} />);
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('renders legend color squares (5 levels)', () => {
    const data = makeData(7);
    const { container } = render(<ActivityHeatmap data={data} />);
    // The legend renders 5 colored divs (counts: 0,2,4,6,8)
    const legendRow = container.querySelectorAll('.flex.items-center.gap-1 .w-3.h-3');
    expect(legendRow.length).toBe(5);
  });

  it('renders invisible squares for padding', () => {
    // startDate 2024-01-01 is a Monday (dayOfWeek=1), so 1 invisible pad cell
    const data = makeData(7, '2024-01-01');
    const { container } = render(<ActivityHeatmap data={data} />);
    const invisibles = container.querySelectorAll('.invisible');
    expect(invisibles.length).toBeGreaterThan(0);
  });

  it('renders tooltip title attribute on data cells', () => {
    const data = makeData(7, '2024-01-07'); // Sunday — no padding
    const { container } = render(<ActivityHeatmap data={data} />);
    // Each day cell should have a title like "Jan 7, 2024: 0 sessions"
    const cells = container.querySelectorAll('[title]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('summary shows correct 0 sessions when all counts are 0', () => {
    const data = makeData(7).map((d) => ({ ...d, count: 0 }));
    render(<ActivityHeatmap data={data} />);
    expect(screen.getByText('0 total study sessions')).toBeInTheDocument();
    expect(screen.getByText(/0 study days/)).toBeInTheDocument();
  });
});
