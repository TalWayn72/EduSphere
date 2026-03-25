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
  useTranslation: () => ({ t: (k: string) => k }),
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

import { MarketplaceBrowse } from './MarketplaceBrowse';

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(items?: unknown[], fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: items
        ? { marketplaceListings: { items, totalCount: items.length } }
        : undefined,
      fetching,
      error: undefined,
    },
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([{}, vi.fn().mockResolvedValue({ data: null })] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MarketplaceBrowse', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders marketplace browse page', () => {
    setupMocks([]);
    render(<MarketplaceBrowse />);
    expect(screen.getByTestId('marketplace-browse-page')).toBeInTheDocument();
  });

  it('renders search input and category filter', () => {
    setupMocks([]);
    render(<MarketplaceBrowse />);
    expect(screen.getByLabelText('marketplace.searchLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('marketplace.categoryLabel')).toBeInTheDocument();
  });

  it('shows skeleton grid when loading', () => {
    setupMocks(undefined, true);
    render(<MarketplaceBrowse />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows no results message when empty', () => {
    setupMocks([]);
    render(<MarketplaceBrowse />);
    expect(screen.getByText('marketplace.noResults')).toBeInTheDocument();
  });

  it('renders course cards when data is present', () => {
    setupMocks([
      {
        id: 'c1', title: 'Machine Learning', description: 'ML basics',
        priceUsdCents: 4999, category: 'technology', rating: 4, reviewCount: 10,
        thumbnailUrl: '', instructorName: 'Dr. Smith',
      },
    ]);
    render(<MarketplaceBrowse />);
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
  });

  it('shows "Free" for zero-price courses', () => {
    setupMocks([
      {
        id: 'c2', title: 'Free Course', description: 'test',
        priceUsdCents: 0, category: 'design', rating: 3, reviewCount: 5,
        thumbnailUrl: '', instructorName: 'Jane',
      },
    ]);
    render(<MarketplaceBrowse />);
    expect(screen.getByText('marketplace.free')).toBeInTheDocument();
  });
});
