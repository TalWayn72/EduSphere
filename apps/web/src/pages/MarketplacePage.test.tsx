import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
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

vi.mock('@/components/PurchaseCourseButton', () => ({
  PurchaseCourseButton: vi.fn(() => null),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { MarketplacePage } from './MarketplacePage';
import * as tanstack from '@tanstack/react-query';

// ── Fixtures ──────────────────────────────────────────────────────────────────

// courseId.slice(0, 8) is used in the card title: 'Course aabbccdd...'
const MOCK_LISTINGS = [
  {
    id: 'lst-1',
    courseId: 'aabbccdd-1111-2222-3333-000000000001',
    priceCents: 2999,
    currency: 'USD',
    isPublished: true,
    revenueSplitPercent: 70,
  },
  {
    id: 'lst-2',
    courseId: 'eeff0011-1111-2222-3333-000000000002',
    priceCents: 0,
    currency: 'USD',
    isPublished: true,
    revenueSplitPercent: 50,
  },
];

const IDLE_RESULT = { data: undefined, isLoading: false, error: null };

function makeQuery(overrides: Record<string, unknown> = {}) {
  return { ...IDLE_RESULT, ...overrides } as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ data: { courseListings: [], myPurchases: [] } })
    );
  });

  it('shows "Course Marketplace" heading', () => {
    render(<MarketplacePage />);
    expect(
      screen.getByRole('heading', { name: /course marketplace/i })
    ).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ isLoading: true })
    );
    const { container } = render(<MarketplacePage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ error: new Error('Server error') })
    );
    render(<MarketplacePage />);
    expect(screen.getByText(/failed to load marketplace/i)).toBeInTheDocument();
  });

  it('shows "No courses available yet" when listings are empty', () => {
    render(<MarketplacePage />);
    expect(screen.getByText(/no courses available yet/i)).toBeInTheDocument();
  });

  it('renders listing cards when data is provided', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ data: { courseListings: MOCK_LISTINGS, myPurchases: [] } })
    );
    render(<MarketplacePage />);
    // Component renders: `Course ${courseId.slice(0, 8)}...`
    expect(screen.getByText('Course aabbccdd...')).toBeInTheDocument();
    expect(screen.getByText('Course eeff0011...')).toBeInTheDocument();
  });

  it('shows formatted price for paid listings', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: { courseListings: [MOCK_LISTINGS[0]], myPurchases: [] },
      })
    );
    render(<MarketplacePage />);
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  it('shows "Free" for listings with priceCents=0', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: { courseListings: [MOCK_LISTINGS[1]], myPurchases: [] },
      })
    );
    render(<MarketplacePage />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows "Purchased" badge for purchased courses', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: {
          courseListings: [MOCK_LISTINGS[0]],
          myPurchases: [
            {
              courseId: 'aabbccdd-1111-2222-3333-000000000001',
              status: 'COMPLETE',
            },
          ],
        },
      })
    );
    render(<MarketplacePage />);
    expect(screen.getByText('Purchased')).toBeInTheDocument();
  });

  it('shows revenue split percentage', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: { courseListings: [MOCK_LISTINGS[0]], myPurchases: [] },
      })
    );
    render(<MarketplacePage />);
    expect(screen.getByText(/instructor earns 70%/i)).toBeInTheDocument();
  });
});
