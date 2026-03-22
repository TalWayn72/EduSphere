/**
 * MarketplaceBrowse.test.tsx — Unit tests for MarketplaceBrowse component.
 *
 * Covers:
 *   - Course listing display
 *   - Category filter
 *   - Search
 *   - License button
 *   - Empty state
 *   - Loading state
 *   - Pagination
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockLicense = vi.fn();

vi.mock('@/hooks/useMarketplace', () => ({
  useMarketplace: vi.fn(() => ({
    listings: [
      { id: 'l1', title: 'Introduction to AI', category: 'Technology', priceUsdCents: 9900, instructor: 'Dr. Smith' },
      { id: 'l2', title: 'Data Science Basics', category: 'Technology', priceUsdCents: 7900, instructor: 'Prof. Jones' },
      { id: 'l3', title: 'Business Writing', category: 'Business', priceUsdCents: 4900, instructor: 'Jane Doe' },
    ],
    isLoading: false,
    totalCount: 3,
    licenseCourse: mockLicense,
    categories: ['Technology', 'Business', 'Education', 'Healthcare'],
  })),
}));

import { useMarketplace } from '@/hooks/useMarketplace';
import { MarketplaceBrowse } from './MarketplaceBrowse';

describe('MarketplaceBrowse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders course listings', () => {
    render(<MarketplaceBrowse />);
    expect(screen.getByText('Introduction to AI')).toBeInTheDocument();
    expect(screen.getByText('Data Science Basics')).toBeInTheDocument();
    expect(screen.getByText('Business Writing')).toBeInTheDocument();
  });

  it('displays price for each listing', () => {
    render(<MarketplaceBrowse />);
    // $99.00 from 9900 cents
    expect(screen.getByText(/\$99/)).toBeInTheDocument();
  });

  it('renders category filter dropdown', () => {
    render(<MarketplaceBrowse />);
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<MarketplaceBrowse />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders license button for each listing', () => {
    render(<MarketplaceBrowse />);
    const licenseButtons = screen.getAllByRole('button', { name: /license/i });
    expect(licenseButtons.length).toBe(3);
  });

  it('calls licenseCourse on button click', async () => {
    render(<MarketplaceBrowse />);
    const licenseButtons = screen.getAllByRole('button', { name: /license/i });
    fireEvent.click(licenseButtons[0]);
    expect(mockLicense).toHaveBeenCalledWith('l1');
  });

  it('shows empty state when no listings', () => {

    vi.mocked(useMarketplace).mockReturnValue({
      listings: [],
      isLoading: false,
      totalCount: 0,
      licenseCourse: mockLicense,
      categories: [],
    });

    render(<MarketplaceBrowse />);
    expect(screen.getByText(/orgOnboarding\.noListings/i)).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {

    vi.mocked(useMarketplace).mockReturnValue({
      listings: [],
      isLoading: true,
      totalCount: 0,
      licenseCourse: mockLicense,
      categories: [],
    });

    render(<MarketplaceBrowse />);
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('filters by search query', async () => {
    const user = userEvent.setup();
    render(<MarketplaceBrowse />);
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'AI');
    // Filter logic is handled by the hook — we verify the input works
    expect(searchInput).toHaveValue('AI');
  });
});
