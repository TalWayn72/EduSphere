/**
 * TrialBanner.test.tsx — Unit tests for TrialBanner component.
 *
 * Covers:
 *   - Countdown display (days remaining)
 *   - Urgency levels (green > 30 days, yellow 7-30, orange 2-7, red ≤ 2)
 *   - Hidden when subscription is active (not trialing)
 *   - Upgrade CTA button
 *   - Accessibility (aria-live for countdown)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'orgOnboarding.trialDaysRemaining')
        return `${opts?.days} days remaining`;
      if (key === 'orgOnboarding.trialExpired') return 'Trial expired';
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn(() => ({
    status: 'trialing',
    daysRemaining: 45,
    planName: 'STARTER',
  })),
}));

import { useSubscription } from '@/hooks/useSubscription';
import { TrialBanner } from './TrialBanner';

describe('TrialBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays days remaining', () => {
    render(<TrialBanner />);
    expect(screen.getByText(/45 days remaining/)).toBeInTheDocument();
  });

  it('shows upgrade button', () => {
    render(<TrialBanner />);
    expect(screen.getByRole('link', { name: /upgrade/i })).toBeInTheDocument();
  });

  it('renders nothing when subscription is active', () => {
    vi.mocked(useSubscription).mockReturnValue({
      status: 'active',
      daysRemaining: 0,
      planName: 'PROFESSIONAL',
    });

    const { container } = render(<TrialBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows green urgency when > 30 days remain', () => {
    vi.mocked(useSubscription).mockReturnValue({
      status: 'trialing',
      daysRemaining: 60,
      planName: 'STARTER',
    });

    render(<TrialBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('data-urgency', 'low');
  });

  it('shows yellow urgency when 7-30 days remain', () => {
    vi.mocked(useSubscription).mockReturnValue({
      status: 'trialing',
      daysRemaining: 15,
      planName: 'STARTER',
    });

    render(<TrialBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('data-urgency', 'medium');
  });

  it('shows orange urgency when 2-7 days remain', () => {
    vi.mocked(useSubscription).mockReturnValue({
      status: 'trialing',
      daysRemaining: 5,
      planName: 'STARTER',
    });

    render(<TrialBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('data-urgency', 'high');
  });

  it('shows red urgency when ≤ 2 days remain', () => {
    vi.mocked(useSubscription).mockReturnValue({
      status: 'trialing',
      daysRemaining: 1,
      planName: 'STARTER',
    });

    render(<TrialBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('data-urgency', 'critical');
  });

  it('shows expired message when days = 0', () => {
    vi.mocked(useSubscription).mockReturnValue({
      status: 'past_due',
      daysRemaining: 0,
      planName: 'STARTER',
    });

    render(<TrialBanner />);
    expect(screen.getByText(/trial expired/i)).toBeInTheDocument();
  });

  it('has aria-live="polite" for dynamic countdown', () => {
    render(<TrialBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
