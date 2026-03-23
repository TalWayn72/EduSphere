/**
 * useMarketplace — Hook for browsing and licensing marketplace courses.
 */

export interface MarketplaceListing {
  id: string;
  title: string;
  category: string;
  priceUsdCents: number;
  instructor: string;
}

export interface UseMarketplaceReturn {
  listings: MarketplaceListing[];
  isLoading: boolean;
  totalCount: number;
  licenseCourse: (listingId: string) => void;
  categories: string[];
}

export function useMarketplace(): UseMarketplaceReturn {
  // Placeholder — will be wired to GraphQL
  return {
    listings: [],
    isLoading: false,
    totalCount: 0,
    licenseCourse: () => {},
    categories: [],
  };
}
