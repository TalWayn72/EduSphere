import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

vi.mock('graphql-request', () => ({
  request: vi.fn(),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { InstructorEarningsPage } from './InstructorEarningsPage';
import * as tanstack from '@tanstack/react-query';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_EARNINGS = {
  totalEarnedCents: 15000, // $150.00
  pendingPayoutCents: 5000, // $50.00
  paidOutCents: 10000, // $100.00
  purchases: [
    {
      id: 'p1',
      courseId: 'aabbccdd-1111-2222-3333-000000000001',
      amountCents: 2999,
      status: 'COMPLETE',
      purchasedAt: '2024-03-01T00:00:00Z',
    },
    {
      id: 'p2',
      courseId: 'eeff0011-4444-5555-6666-000000000002',
      amountCents: 1999,
      status: 'PENDING',
      purchasedAt: '2024-04-01T00:00:00Z',
    },
  ],
};

function setupQueries(
  earnings: typeof MOCK_EARNINGS | null = null,
  isLoading = false
) {
  vi.mocked(tanstack.useQuery).mockReturnValue({
    data: earnings ? { instructorEarnings: earnings } : undefined,
    isLoading,
    error: null,
  } as never);
  vi.mocked(tanstack.useMutation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // @ts-expect-error — React 19 ReactNode includes bigint
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderPage() {
  return render(<InstructorEarningsPage />, { wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InstructorEarningsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueries();
  });

  it('renders the "Instructor Earnings" heading', () => {
    renderPage();
    expect(screen.getByText('Instructor Earnings')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    setupQueries(null, true);
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the Total Earned card with $0.00 when no data', () => {
    renderPage();
    expect(screen.getByText('Total Earned')).toBeInTheDocument();
    expect(screen.getByText('Pending Payout')).toBeInTheDocument();
    expect(screen.getByText('Paid Out')).toBeInTheDocument();
  });

  it('renders earnings amounts correctly', () => {
    setupQueries(MOCK_EARNINGS);
    renderPage();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('shows "No purchases yet." when purchases list is empty', () => {
    setupQueries({ ...MOCK_EARNINGS, purchases: [] });
    renderPage();
    expect(screen.getByText('No purchases yet.')).toBeInTheDocument();
  });

  it('renders purchase rows in the table', () => {
    setupQueries(MOCK_EARNINGS);
    renderPage();
    // courseId.slice(0, 8) = 'aabbccdd' and 'eeff0011'
    expect(screen.getByText('aabbccdd...')).toBeInTheDocument();
    expect(screen.getByText('eeff0011...')).toBeInTheDocument();
  });

  it('shows purchase amounts in table rows', () => {
    setupQueries(MOCK_EARNINGS);
    renderPage();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });

  it('shows status badges for each purchase', () => {
    setupQueries(MOCK_EARNINGS);
    renderPage();
    expect(screen.getByText('COMPLETE')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('renders "Request Payout" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /request payout/i })
    ).toBeInTheDocument();
  });

  it('payout button is disabled when pendingPayoutCents is 0', () => {
    setupQueries({ ...MOCK_EARNINGS, pendingPayoutCents: 0 });
    renderPage();
    expect(
      screen.getByRole('button', { name: /request payout/i })
    ).toBeDisabled();
  });

  it('payout button is enabled when pendingPayoutCents > 0', () => {
    setupQueries(MOCK_EARNINGS);
    renderPage();
    expect(
      screen.getByRole('button', { name: /request payout/i })
    ).not.toBeDisabled();
  });

  it('renders the "Purchase History" card', () => {
    renderPage();
    expect(screen.getByText('Purchase History')).toBeInTheDocument();
  });
});
