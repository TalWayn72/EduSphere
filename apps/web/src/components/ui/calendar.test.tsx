import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock(
  'lucide-react',
  () =>
    new Proxy({} as Record<string, unknown>, {
      get: (_, name) => {
        if (name === '__esModule') return true;
        return function MockIcon(props: Record<string, unknown>) {
          return <span data-testid={`icon-${String(name)}`} {...props} />;
        };
      },
    })
);

import { Calendar } from './calendar';

describe('Calendar', () => {
  it('renders the calendar container', () => {
    render(<Calendar />);
    expect(screen.getByTestId('calendar')).toBeInTheDocument();
  });

  it('displays day-of-week headers', () => {
    render(<Calendar />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('displays the current month and year', () => {
    const date = new Date(2026, 2, 15); // March 2026
    render(<Calendar selected={date} />);
    expect(screen.getByText(/march/i)).toBeInTheDocument();
    expect(screen.getByText(/2026/i)).toBeInTheDocument();
  });

  it('renders day numbers for the month', () => {
    const date = new Date(2026, 0, 10); // January 2026 has 31 days
    render(<Calendar selected={date} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('marks the selected date with aria-selected', () => {
    const date = new Date(2026, 0, 15);
    render(<Calendar selected={date} />);
    const selectedBtn = screen.getByText('15');
    expect(selectedBtn).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onSelect when a day is clicked', () => {
    const handler = vi.fn();
    const date = new Date(2026, 0, 10);
    render(<Calendar selected={date} onSelect={handler} />);
    fireEvent.click(screen.getByText('20'));
    expect(handler).toHaveBeenCalledTimes(1);
    const arg = handler.mock.calls[0][0] as Date;
    expect(arg.getDate()).toBe(20);
    expect(arg.getMonth()).toBe(0);
    expect(arg.getFullYear()).toBe(2026);
  });

  it('navigates to previous month', () => {
    const date = new Date(2026, 2, 15); // March
    render(<Calendar selected={date} />);
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(screen.getByText(/february/i)).toBeInTheDocument();
  });

  it('navigates to next month', () => {
    const date = new Date(2026, 2, 15); // March
    render(<Calendar selected={date} />);
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText(/april/i)).toBeInTheDocument();
  });

  it('disables dates before minDate', () => {
    const selected = new Date(2026, 0, 15);
    const minDate = new Date(2026, 0, 10);
    render(<Calendar selected={selected} minDate={minDate} />);
    const day5 = screen.getByText('5');
    expect(day5).toBeDisabled();
  });

  it('disables dates after maxDate', () => {
    const selected = new Date(2026, 0, 15);
    const maxDate = new Date(2026, 0, 20);
    render(<Calendar selected={selected} maxDate={maxDate} />);
    const day25 = screen.getByText('25');
    expect(day25).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Calendar className="mt-4" />);
    expect(screen.getByTestId('calendar')).toHaveClass('mt-4');
  });

  it('has accessible navigation labels', () => {
    render(<Calendar />);
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
    expect(screen.getByLabelText('Next month')).toBeInTheDocument();
  });
});
