// @vitest-environment jsdom
/**
 * TrialBanner component tests
 *
 * Verifies:
 *  1. Returns null when not trialing
 *  2. Renders banner with days remaining
 *  3. Shows red styling for ≤3 days
 *  4. Shows yellow styling for ≤7 days
 *  5. Shows blue styling for >7 days
 *  6. Shows "expired" text for 0 days
 *  7. Shows upgrade button
 *  8. Dismiss hides the banner
 *  9. Has alert role
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockTrialData = {
  isTrialing: true,
  daysRemaining: 14,
  trialEndsAt: '2026-04-10T00:00:00Z',
  upgradeUrl: '/billing/upgrade',
};

let mockQueryResult: { data: { trialStatus: typeof mockTrialData } | null } = {
  data: { trialStatus: mockTrialData },
};

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [mockQueryResult]),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { TrialBanner } from './TrialBanner';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('TrialBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: { trialStatus: mockTrialData } };
  });

  it('returns null when not trialing', () => {
    mockQueryResult = { data: { trialStatus: { ...mockTrialData, isTrialing: false } } };
    const { container } = render(<TrialBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no data', () => {
    mockQueryResult = { data: null };
    const { container } = render(<TrialBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders banner with days remaining text', () => {
    render(<TrialBanner />);
    expect(screen.getByText(/14/)).toBeInTheDocument();
  });

  it('has alert role', () => {
    render(<TrialBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has correct data-testid', () => {
    render(<TrialBanner />);
    expect(screen.getByTestId('trial-banner')).toBeInTheDocument();
  });

  it('shows blue styling for >7 days', () => {
    render(<TrialBanner />);
    const banner = screen.getByTestId('trial-banner');
    expect(banner.className).toContain('blue');
  });

  it('shows yellow styling for ≤7 days', () => {
    mockQueryResult = { data: { trialStatus: { ...mockTrialData, daysRemaining: 5 } } };
    render(<TrialBanner />);
    const banner = screen.getByTestId('trial-banner');
    expect(banner.className).toContain('yellow');
  });

  it('shows red styling for ≤3 days', () => {
    mockQueryResult = { data: { trialStatus: { ...mockTrialData, daysRemaining: 2 } } };
    render(<TrialBanner />);
    const banner = screen.getByTestId('trial-banner');
    expect(banner.className).toContain('red');
  });

  it('shows expired text for 0 days', () => {
    mockQueryResult = { data: { trialStatus: { ...mockTrialData, daysRemaining: 0 } } };
    render(<TrialBanner />);
    expect(screen.getByText('Your trial has expired')).toBeInTheDocument();
  });

  it('shows upgrade button', () => {
    render(<TrialBanner />);
    expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
  });

  it('dismiss hides the banner', () => {
    render(<TrialBanner />);
    expect(screen.getByTestId('trial-banner')).toBeInTheDocument();

    // Click dismiss (x button)
    const dismissBtn = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('trial-banner')).not.toBeInTheDocument();
  });
});
