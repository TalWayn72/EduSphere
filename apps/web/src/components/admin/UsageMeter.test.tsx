/**
 * UsageMeter — unit tests (pure SVG, no mocks needed)
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UsageMeter } from './UsageMeter';

describe('UsageMeter', () => {
  it('renders data-testid="usage-meter"', () => {
    render(<UsageMeter current={100} limit={500} />);
    expect(screen.getByTestId('usage-meter')).toBeInTheDocument();
  });

  it('shows correct current number', () => {
    render(<UsageMeter current={342} limit={500} />);
    expect(screen.getByTestId('usage-meter-current')).toHaveTextContent('342');
  });

  it('shows correct percentage text', () => {
    render(<UsageMeter current={250} limit={500} />);
    expect(screen.getByTestId('usage-meter-pct')).toHaveTextContent('50% utilized');
  });

  it('SVG progress circle has green stroke when utilization < 80%', () => {
    const { container } = render(<UsageMeter current={200} limit={500} />);
    const circles = container.querySelectorAll('circle');
    // Second circle is the progress arc
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute('stroke', '#22c55e');
  });

  it('SVG progress circle has yellow stroke when utilization 80–99%', () => {
    const { container } = render(<UsageMeter current={400} limit={500} />);
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute('stroke', '#eab308');
  });

  it('SVG progress circle has red stroke when utilization >= 100%', () => {
    const { container } = render(<UsageMeter current={500} limit={500} />);
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute('stroke', '#ef4444');
  });

  it('shows 100% when over limit', () => {
    render(<UsageMeter current={600} limit={500} />);
    expect(screen.getByTestId('usage-meter-pct')).toHaveTextContent('120% utilized');
  });

  it('renders label when provided', () => {
    render(<UsageMeter current={100} limit={500} label="Yearly Active Users" />);
    expect(screen.getByText('Yearly Active Users')).toBeInTheDocument();
  });
});
