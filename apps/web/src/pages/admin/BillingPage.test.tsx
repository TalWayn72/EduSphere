import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, _d?: Record<string, unknown>) => k }),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} />
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { BillingPage } from './BillingPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockMutationExec = vi.fn().mockResolvedValue({ data: null });

function setupMocks(subData?: Record<string, unknown>, fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: subData ? { tenantSubscription: subData } : undefined,
      fetching,
      error: undefined,
    },
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([{}, mockMutationExec] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BillingPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders billing page within AdminLayout', () => {
    setupMocks();
    render(<BillingPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByTestId('billing-page')).toBeInTheDocument();
  });

  it('shows skeleton when fetching', () => {
    setupMocks(undefined, true);
    render(<BillingPage />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows no-subscription message when data is null', () => {
    setupMocks(undefined, false);
    render(<BillingPage />);
    expect(screen.getByText('billing.noSubscription')).toBeInTheDocument();
  });

  it('shows subscription details when data is present', () => {
    setupMocks({
      planName: 'PROFESSIONAL',
      status: 'active',
      currentPeriodEnd: '2026-12-31T00:00:00Z',
      yauUsed: 250,
      yauLimit: 500,
      priceFormatted: '$99',
      billingPeriod: 'month',
    });
    render(<BillingPage />);
    // PROFESSIONAL appears in both the current plan header and plan grid
    const proTexts = screen.getAllByText('PROFESSIONAL');
    expect(proTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$99 / month')).toBeInTheDocument();
  });

  it('renders plan cards with upgrade buttons', () => {
    setupMocks({
      planName: 'STARTER',
      status: 'active',
      currentPeriodEnd: '2026-12-31T00:00:00Z',
      yauUsed: 100,
      yauLimit: 500,
      priceFormatted: '$49',
      billingPeriod: 'month',
    });
    render(<BillingPage />);
    // Each plan name appears in both header and grid
    expect(screen.getAllByText('STARTER').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PROFESSIONAL').length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getAllByText('ENTERPRISE').length).toBeGreaterThanOrEqual(1);
  });

  it('has sr-only heading for accessibility', () => {
    setupMocks();
    render(<BillingPage />);
    expect(screen.getByText('Billing')).toHaveClass('sr-only');
  });
});
