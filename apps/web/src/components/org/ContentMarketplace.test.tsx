/**
 * ContentMarketplace.test.tsx — Unit tests for ContentMarketplace component.
 *
 * Covers:
 *   - Item rendering with title, description, price
 *   - Search filtering
 *   - Category filtering
 *   - Add to cart functionality
 *   - Cart display and total calculation
 *   - Remove from cart
 *   - Checkout button trigger
 *   - Loading skeleton state
 *   - Empty results state
 *   - Free item price label
 *   - Accessibility (search label, category label)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockAddToCart = vi.fn();
const mockRemoveFromCart = vi.fn();
const mockClearCart = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetSelectedCategory = vi.fn();
const mockCreateCheckoutSession = vi.fn().mockResolvedValue('cs_mock_123');

const sampleItems = [
  {
    id: 'mkt-1',
    title: 'ML Course',
    description: 'Learn ML basics',
    category: 'technology',
    priceUsdCents: 4999,
    instructor: 'Dr. Smith',
    rating: 4.8,
    enrollmentCount: 12500,
  },
  {
    id: 'mkt-2',
    title: 'Business Strategy',
    description: 'Core strategy concepts',
    category: 'business',
    priceUsdCents: 3999,
    instructor: 'Prof. Johnson',
    rating: 4.5,
    enrollmentCount: 8200,
  },
  {
    id: 'mkt-3',
    title: 'Free Compliance',
    description: 'GDPR compliance',
    category: 'compliance',
    priceUsdCents: 0,
    instructor: 'Legal',
    rating: 4.2,
    enrollmentCount: 15000,
  },
];

vi.mock('@/hooks/useContentMarketplace', () => ({
  useContentMarketplace: vi.fn(() => ({
    items: sampleItems,
    filteredItems: sampleItems,
    isLoading: false,
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    selectedCategory: '',
    setSelectedCategory: mockSetSelectedCategory,
    categories: ['technology', 'business', 'compliance'],
    cart: [],
    cartTotal: 0,
    addToCart: mockAddToCart,
    removeFromCart: mockRemoveFromCart,
    clearCart: mockClearCart,
    isInCart: () => false,
  })),
}));

vi.mock('@/hooks/useStripeCheckout', () => ({
  useStripeCheckout: vi.fn(() => ({
    status: 'idle',
    error: null,
    sessionId: null,
    createCheckoutSession: mockCreateCheckoutSession,
    resetCheckout: vi.fn(),
  })),
}));

import { useContentMarketplace } from '@/hooks/useContentMarketplace';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { ContentMarketplace } from './ContentMarketplace';

describe('ContentMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useContentMarketplace).mockReturnValue({
      items: sampleItems,
      filteredItems: sampleItems,
      isLoading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      selectedCategory: '',
      setSelectedCategory: mockSetSelectedCategory,
      categories: ['technology', 'business', 'compliance'],
      cart: [],
      cartTotal: 0,
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      isInCart: () => false,
    });
    vi.mocked(useStripeCheckout).mockReturnValue({
      status: 'idle',
      error: null,
      sessionId: null,
      createCheckoutSession: mockCreateCheckoutSession,
      resetCheckout: vi.fn(),
    });
  });

  it('renders marketplace title and description', () => {
    render(<ContentMarketplace />);
    expect(screen.getByText('Content Marketplace')).toBeInTheDocument();
    expect(
      screen.getByText('Browse and license courses for your organization')
    ).toBeInTheDocument();
  });

  it('renders all marketplace items', () => {
    render(<ContentMarketplace />);
    expect(screen.getByText('ML Course')).toBeInTheDocument();
    expect(screen.getByText('Business Strategy')).toBeInTheDocument();
    expect(screen.getByText('Free Compliance')).toBeInTheDocument();
  });

  it('shows correct price for paid items', () => {
    render(<ContentMarketplace />);
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('$39.99')).toBeInTheDocument();
  });

  it('shows Free label for zero-price items', () => {
    render(<ContentMarketplace />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders search input with correct aria-label', () => {
    render(<ContentMarketplace />);
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls setSearchQuery on search input change', () => {
    render(<ContentMarketplace />);
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'ML' } });
    expect(mockSetSearchQuery).toHaveBeenCalledWith('ML');
  });

  it('renders category filter dropdown', () => {
    render(<ContentMarketplace />);
    const categorySelect = screen.getByLabelText('Filter by category');
    expect(categorySelect).toBeInTheDocument();
  });

  it('calls setSelectedCategory on category change', () => {
    render(<ContentMarketplace />);
    const select = screen.getByLabelText('Filter by category');
    fireEvent.change(select, { target: { value: 'technology' } });
    expect(mockSetSelectedCategory).toHaveBeenCalledWith('technology');
  });

  it('calls addToCart when Add to Org button is clicked', () => {
    render(<ContentMarketplace />);
    const addButtons = screen.getAllByText('Add to Org');
    fireEvent.click(addButtons[0]);
    expect(mockAddToCart).toHaveBeenCalledWith(sampleItems[0]);
  });

  it('shows In Cart for items already in cart', () => {
    vi.mocked(useContentMarketplace).mockReturnValue({
      items: sampleItems,
      filteredItems: sampleItems,
      isLoading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      selectedCategory: '',
      setSelectedCategory: mockSetSelectedCategory,
      categories: ['technology', 'business', 'compliance'],
      cart: [{ itemId: 'mkt-1', title: 'ML Course', priceUsdCents: 4999 }],
      cartTotal: 4999,
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      isInCart: (id: string) => id === 'mkt-1',
    });

    render(<ContentMarketplace />);
    expect(screen.getByText('In Cart')).toBeInTheDocument();
  });

  it('renders cart sidebar when items are in cart', () => {
    vi.mocked(useContentMarketplace).mockReturnValue({
      items: sampleItems,
      filteredItems: sampleItems,
      isLoading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      selectedCategory: '',
      setSelectedCategory: mockSetSelectedCategory,
      categories: ['technology', 'business', 'compliance'],
      cart: [
        { itemId: 'mkt-1', title: 'ML Course', priceUsdCents: 4999 },
        { itemId: 'mkt-2', title: 'Business Strategy', priceUsdCents: 3999 },
      ],
      cartTotal: 8998,
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      isInCart: (id: string) => id === 'mkt-1' || id === 'mkt-2',
    });

    render(<ContentMarketplace />);
    expect(screen.getByTestId('cart-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Cart (2)')).toBeInTheDocument();
    expect(screen.getByText('Total: $89.98')).toBeInTheDocument();
  });

  it('calls removeFromCart when Remove button is clicked', () => {
    vi.mocked(useContentMarketplace).mockReturnValue({
      items: sampleItems,
      filteredItems: sampleItems,
      isLoading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      selectedCategory: '',
      setSelectedCategory: mockSetSelectedCategory,
      categories: ['technology', 'business', 'compliance'],
      cart: [{ itemId: 'mkt-1', title: 'ML Course', priceUsdCents: 4999 }],
      cartTotal: 4999,
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      isInCart: (id: string) => id === 'mkt-1',
    });

    render(<ContentMarketplace />);
    fireEvent.click(screen.getByLabelText('Remove ML Course'));
    expect(mockRemoveFromCart).toHaveBeenCalledWith('mkt-1');
  });

  it('calls createCheckoutSession on checkout click', () => {
    vi.mocked(useContentMarketplace).mockReturnValue({
      items: sampleItems,
      filteredItems: sampleItems,
      isLoading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      selectedCategory: '',
      setSelectedCategory: mockSetSelectedCategory,
      categories: ['technology', 'business', 'compliance'],
      cart: [{ itemId: 'mkt-1', title: 'ML Course', priceUsdCents: 4999 }],
      cartTotal: 4999,
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      isInCart: (id: string) => id === 'mkt-1',
    });

    render(<ContentMarketplace />);
    fireEvent.click(screen.getByText('Checkout'));
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith([
      { itemId: 'mkt-1', title: 'ML Course', priceUsdCents: 4999, quantity: 1 },
    ]);
  });

  it('shows loading skeletons when isLoading is true', () => {
    vi.mocked(useContentMarketplace).mockReturnValue({
      items: [],
      filteredItems: [],
      isLoading: true,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      selectedCategory: '',
      setSelectedCategory: mockSetSelectedCategory,
      categories: [],
      cart: [],
      cartTotal: 0,
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      isInCart: () => false,
    });

    render(<ContentMarketplace />);
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(6);
  });

  it('shows no results message when filtered list is empty', () => {
    vi.mocked(useContentMarketplace).mockReturnValue({
      items: sampleItems,
      filteredItems: [],
      isLoading: false,
      searchQuery: 'nonexistent',
      setSearchQuery: mockSetSearchQuery,
      selectedCategory: '',
      setSelectedCategory: mockSetSelectedCategory,
      categories: ['technology', 'business', 'compliance'],
      cart: [],
      cartTotal: 0,
      addToCart: mockAddToCart,
      removeFromCart: mockRemoveFromCart,
      clearCart: mockClearCart,
      isInCart: () => false,
    });

    render(<ContentMarketplace />);
    expect(
      screen.getByText('No courses found matching your criteria')
    ).toBeInTheDocument();
  });

  it('shows item ratings', () => {
    render(<ContentMarketplace />);
    expect(screen.getByText('4.8 / 5')).toBeInTheDocument();
    expect(screen.getByText('4.5 / 5')).toBeInTheDocument();
  });

  it('shows No preview placeholder when no thumbnail', () => {
    render(<ContentMarketplace />);
    const placeholders = screen.getAllByText('No preview');
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });
});
