import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PilotBanner } from './PilotBanner';

function renderBanner(daysRemaining: number) {
  return render(
    <MemoryRouter>
      <PilotBanner daysRemaining={daysRemaining} />
    </MemoryRouter>
  );
}

describe('PilotBanner', () => {
  it('renders pilot-banner test id', () => {
    renderBanner(30);
    expect(screen.getByTestId('pilot-banner')).toBeInTheDocument();
  });

  it('shows the days remaining count', () => {
    renderBanner(30);
    expect(screen.getByTestId('pilot-banner')).toHaveTextContent('30');
  });

  it('shows "days remaining" text', () => {
    renderBanner(30);
    expect(screen.getByTestId('pilot-banner')).toHaveTextContent(/days remaining/i);
  });

  it('shows singular "day" when 1 day remaining', () => {
    renderBanner(1);
    expect(screen.getByTestId('pilot-banner')).toHaveTextContent('1 day remaining');
  });

  it('adds animate-pulse class when daysRemaining < 14', () => {
    renderBanner(13);
    expect(screen.getByTestId('pilot-banner')).toHaveClass('animate-pulse');
  });

  it('adds animate-pulse class when daysRemaining is 0', () => {
    renderBanner(0);
    expect(screen.getByTestId('pilot-banner')).toHaveClass('animate-pulse');
  });

  it('does NOT add animate-pulse when daysRemaining is 14', () => {
    renderBanner(14);
    expect(screen.getByTestId('pilot-banner')).not.toHaveClass('animate-pulse');
  });

  it('does NOT add animate-pulse when daysRemaining > 14', () => {
    renderBanner(45);
    expect(screen.getByTestId('pilot-banner')).not.toHaveClass('animate-pulse');
  });

  it('contains an upgrade link pointing to /pricing', () => {
    renderBanner(30);
    const link = screen.getByRole('link', { name: /upgrade/i });
    expect(link).toHaveAttribute('href', '/pricing');
  });
});
