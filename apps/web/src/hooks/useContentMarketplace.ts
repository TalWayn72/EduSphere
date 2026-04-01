/**
 * useContentMarketplace — Hook for browsing/purchasing content from marketplace.
 *
 * Provides listing data, filtering, search, cart management, and purchase flow.
 */
import { useState, useCallback, useMemo } from 'react';

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priceUsdCents: number;
  instructor: string;
  rating: number;
  enrollmentCount: number;
  thumbnailUrl?: string;
}

export interface CartItem {
  itemId: string;
  title: string;
  priceUsdCents: number;
}

export interface UseContentMarketplaceReturn {
  items: MarketplaceItem[];
  filteredItems: MarketplaceItem[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: string[];
  cart: CartItem[];
  cartTotal: number;
  addToCart: (item: MarketplaceItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  isInCart: (itemId: string) => boolean;
}

/** Sample data — will be replaced by GraphQL query. */
const SAMPLE_ITEMS: MarketplaceItem[] = [
  {
    id: 'mkt-1',
    title: 'Introduction to Machine Learning',
    description: 'Comprehensive ML course for beginners',
    category: 'technology',
    priceUsdCents: 4999,
    instructor: 'Dr. Smith',
    rating: 4.8,
    enrollmentCount: 12500,
  },
  {
    id: 'mkt-2',
    title: 'Business Strategy Fundamentals',
    description: 'Core business strategy concepts',
    category: 'business',
    priceUsdCents: 3999,
    instructor: 'Prof. Johnson',
    rating: 4.5,
    enrollmentCount: 8200,
  },
  {
    id: 'mkt-3',
    title: 'UX Design Principles',
    description: 'User experience design from scratch',
    category: 'design',
    priceUsdCents: 2999,
    instructor: 'Jane Doe',
    rating: 4.7,
    enrollmentCount: 6300,
  },
  {
    id: 'mkt-4',
    title: 'Data Privacy & Compliance',
    description: 'GDPR, CCPA, and organizational compliance',
    category: 'compliance',
    priceUsdCents: 0,
    instructor: 'Legal Team',
    rating: 4.2,
    enrollmentCount: 15000,
  },
];

const CATEGORIES = [
  'technology',
  'business',
  'design',
  'science',
  'humanities',
  'compliance',
];

export function useContentMarketplace(): UseContentMarketplaceReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading] = useState(false);

  const items = SAMPLE_ITEMS;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.priceUsdCents, 0),
    [cart]
  );

  const addToCart = useCallback((item: MarketplaceItem) => {
    setCart((prev) => {
      if (prev.some((ci) => ci.itemId === item.id)) return prev;
      return [
        ...prev,
        {
          itemId: item.id,
          title: item.title,
          priceUsdCents: item.priceUsdCents,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.itemId !== itemId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const isInCart = useCallback(
    (itemId: string) => cart.some((ci) => ci.itemId === itemId),
    [cart]
  );

  return {
    items,
    filteredItems,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories: CATEGORIES,
    cart,
    cartTotal,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
  };
}
