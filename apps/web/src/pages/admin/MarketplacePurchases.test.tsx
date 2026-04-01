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
  useTranslation: () => ({ t: (k: string, d?: string) => d ?? k }),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { MarketplacePurchases } from './MarketplacePurchases';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(purchases?: unknown[], fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: purchases ? { purchases } : undefined, fetching, error: undefined },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    {},
    vi.fn().mockResolvedValue({ data: null }),
  ] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplacePurchases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders purchases page', () => {
    setupMocks([]);
    render(<MarketplacePurchases />);
    expect(
      screen.getByTestId('marketplace-purchases-page')
    ).toBeInTheDocument();
  });

  it('shows skeleton when fetching', () => {
    setupMocks(undefined, true);
    render(<MarketplacePurchases />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows no purchases message when list is empty', () => {
    setupMocks([]);
    render(<MarketplacePurchases />);
    expect(screen.getByText('No purchases yet.')).toBeInTheDocument();
  });

  it('renders purchase rows with course title and price', () => {
    setupMocks([
      {
        id: 'p1',
        listingId: 'l1',
        courseTitle: 'React Mastery',
        price: 99.99,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      },
    ]);
    render(<MarketplacePurchases />);
    expect(screen.getByText('React Mastery')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('shows refund button for recent COMPLETED purchases', () => {
    setupMocks([
      {
        id: 'p2',
        listingId: 'l2',
        courseTitle: 'Course X',
        price: 49.0,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(), // within 14-day window
      },
    ]);
    render(<MarketplacePurchases />);
    expect(screen.getByTestId('refund-btn-p2')).toBeInTheDocument();
  });

  it('does not show refund button for REFUNDED purchases', () => {
    setupMocks([
      {
        id: 'p3',
        listingId: 'l3',
        courseTitle: 'Course Y',
        price: 29.0,
        status: 'REFUNDED',
        createdAt: new Date().toISOString(),
      },
    ]);
    render(<MarketplacePurchases />);
    expect(screen.queryByTestId('refund-btn-p3')).not.toBeInTheDocument();
  });

  it('renders within AdminLayout', () => {
    setupMocks([]);
    render(<MarketplacePurchases />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });
});
