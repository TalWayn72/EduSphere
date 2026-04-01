/**
 * useContentMarketplace hook tests
 *
 * Verifies:
 *  1. Returns all sample items initially
 *  2. filteredItems matches items when no filters set
 *  3. Search query filters by title (case-insensitive)
 *  4. Search query filters by description
 *  5. Category filter narrows results
 *  6. Combined search + category filter works
 *  7. Cart starts empty with zero total
 *  8. addToCart adds item to cart
 *  9. addToCart prevents duplicates
 * 10. removeFromCart removes specific item
 * 11. clearCart empties the cart
 * 12. isInCart returns correct boolean
 * 13. cartTotal sums priceUsdCents correctly
 * 14. categories returns predefined list
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContentMarketplace } from './useContentMarketplace';
import type { MarketplaceItem } from './useContentMarketplace';

describe('useContentMarketplace', () => {
  it('returns sample items and defaults', () => {
    const { result } = renderHook(() => useContentMarketplace());
    expect(result.current.items.length).toBeGreaterThanOrEqual(4);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedCategory).toBe('');
    expect(result.current.cart).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
  });

  it('filteredItems equals items when no filters applied', () => {
    const { result } = renderHook(() => useContentMarketplace());
    expect(result.current.filteredItems).toEqual(result.current.items);
  });

  it('filters items by search query (title, case-insensitive)', () => {
    const { result } = renderHook(() => useContentMarketplace());
    act(() => {
      result.current.setSearchQuery('machine learning');
    });
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0]?.title).toContain(
      'Machine Learning'
    );
  });

  it('filters items by search query (description)', () => {
    const { result } = renderHook(() => useContentMarketplace());
    act(() => {
      result.current.setSearchQuery('user experience');
    });
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0]?.category).toBe('design');
  });

  it('filters items by category', () => {
    const { result } = renderHook(() => useContentMarketplace());
    act(() => {
      result.current.setSelectedCategory('business');
    });
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0]?.category).toBe('business');
  });

  it('applies combined search + category filter', () => {
    const { result } = renderHook(() => useContentMarketplace());
    act(() => {
      result.current.setSearchQuery('compliance');
      result.current.setSelectedCategory('compliance');
    });
    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0]?.id).toBe('mkt-4');
  });

  it('returns empty filteredItems when nothing matches', () => {
    const { result } = renderHook(() => useContentMarketplace());
    act(() => {
      result.current.setSearchQuery('nonexistent xyz');
    });
    expect(result.current.filteredItems).toEqual([]);
  });

  it('returns predefined categories', () => {
    const { result } = renderHook(() => useContentMarketplace());
    expect(result.current.categories).toContain('technology');
    expect(result.current.categories).toContain('business');
    expect(result.current.categories).toContain('design');
  });

  // ── Cart tests ─────────────────────────────────────────────────────────────

  it('addToCart adds an item', () => {
    const { result } = renderHook(() => useContentMarketplace());
    const item: MarketplaceItem = result.current.items[0]!;

    act(() => {
      result.current.addToCart(item);
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0]?.itemId).toBe(item.id);
    expect(result.current.cart[0]?.priceUsdCents).toBe(item.priceUsdCents);
  });

  it('addToCart prevents duplicate items', () => {
    const { result } = renderHook(() => useContentMarketplace());
    const item = result.current.items[0]!;

    act(() => {
      result.current.addToCart(item);
    });
    act(() => {
      result.current.addToCart(item);
    });

    expect(result.current.cart.length).toBe(1);
  });

  it('removeFromCart removes the specified item', () => {
    const { result } = renderHook(() => useContentMarketplace());
    const item1 = result.current.items[0]!;
    const item2 = result.current.items[1]!;

    act(() => {
      result.current.addToCart(item1);
      result.current.addToCart(item2);
    });
    act(() => {
      result.current.removeFromCart(item1.id);
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.cart[0]?.itemId).toBe(item2.id);
  });

  it('clearCart empties the cart', () => {
    const { result } = renderHook(() => useContentMarketplace());
    act(() => {
      result.current.addToCart(result.current.items[0]!);
      result.current.addToCart(result.current.items[1]!);
    });
    act(() => {
      result.current.clearCart();
    });
    expect(result.current.cart).toEqual([]);
    expect(result.current.cartTotal).toBe(0);
  });

  it('isInCart returns true for items in cart, false otherwise', () => {
    const { result } = renderHook(() => useContentMarketplace());
    const item = result.current.items[0]!;

    expect(result.current.isInCart(item.id)).toBe(false);
    act(() => {
      result.current.addToCart(item);
    });
    expect(result.current.isInCart(item.id)).toBe(true);
    expect(result.current.isInCart('nonexistent')).toBe(false);
  });

  it('cartTotal sums priceUsdCents of all cart items', () => {
    const { result } = renderHook(() => useContentMarketplace());
    const item1 = result.current.items[0]!; // 4999
    const item2 = result.current.items[1]!; // 3999

    act(() => {
      result.current.addToCart(item1);
      result.current.addToCart(item2);
    });

    expect(result.current.cartTotal).toBe(
      item1.priceUsdCents + item2.priceUsdCents
    );
  });
});
