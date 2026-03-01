import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StreakIndicator } from './StreakIndicator';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('StreakIndicator', () => {
  it('renders the current streak number', () => {
    render(<StreakIndicator currentStreak={7} longestStreak={30} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders "days" label', () => {
    render(<StreakIndicator currentStreak={7} longestStreak={30} />);
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('renders zero streak without error', () => {
    render(<StreakIndicator currentStreak={0} longestStreak={30} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('applies orange flame color when streak is active (> 0)', () => {
    const { container } = render(
      <StreakIndicator currentStreak={7} longestStreak={30} />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('text-orange-500');
  });

  it('applies muted flame color when streak is zero', () => {
    const { container } = render(
      <StreakIndicator currentStreak={0} longestStreak={30} />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('text-muted-foreground');
  });

  it('renders different streak values correctly', () => {
    const { rerender } = render(
      <StreakIndicator currentStreak={1} longestStreak={10} />
    );
    expect(screen.getByText('1')).toBeInTheDocument();

    rerender(<StreakIndicator currentStreak={42} longestStreak={100} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
