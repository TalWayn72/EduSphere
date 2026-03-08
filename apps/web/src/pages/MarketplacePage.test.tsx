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

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="app-sidebar" />,
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { MarketplacePage } from './MarketplacePage';
import * as tanstack from '@tanstack/react-query';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_LISTINGS = [
  {
    id: 'lst-1',
    courseId: 'aabbccdd-1111-2222-3333-000000000001',
    title: 'React Fundamentals',
    description: 'Learn React',
    instructorName: 'John Doe',
    thumbnailUrl: null,
    price: 29.99,
    priceCents: 2999,
    currency: 'USD',
    tags: ['react', 'frontend'],
    enrollmentCount: 120,
    rating: 4.5,
    isPublished: true,
    revenueSplitPercent: 70,
  },
  {
    id: 'lst-2',
    courseId: 'eeff0011-1111-2222-3333-000000000002',
    title: 'Advanced TypeScript',
    description: 'Deep dive into TypeScript',
    instructorName: 'Jane Smith',
    thumbnailUrl: null,
    price: 0,
    priceCents: 0,
    currency: 'USD',
    tags: ['typescript'],
    enrollmentCount: 80,
    rating: 4.8,
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

  it('renders real course title', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ data: { courseListings: MOCK_LISTINGS, myPurchases: [] } })
    );
    render(<MarketplacePage />);
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
  });

  it('renders instructor name', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ data: { courseListings: MOCK_LISTINGS, myPurchases: [] } })
    );
    render(<MarketplacePage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('does NOT render raw UUID fragments as course titles', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ data: { courseListings: MOCK_LISTINGS, myPurchases: [] } })
    );
    render(<MarketplacePage />);
    expect(document.body.textContent).not.toMatch(/Course [0-9a-f]{8}/);
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
    // Both the price span and the select option render "Free" — use getAllByText
    const freeElements = screen.getAllByText('Free');
    expect(freeElements.length).toBeGreaterThanOrEqual(1);
    // At least one should be the price span (not an option element)
    const priceSpan = freeElements.find((el) => el.tagName === 'SPAN');
    expect(priceSpan).toBeInTheDocument();
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

  it('renders search input and price filter select', () => {
    render(<MarketplacePage />);
    expect(
      screen.getByPlaceholderText(/search courses/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox')
    ).toBeInTheDocument();
  });
});
