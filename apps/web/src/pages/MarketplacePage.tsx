import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useQuery } from '@tanstack/react-query';
import { request, gql } from 'graphql-request';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PurchaseCourseButton } from '@/components/PurchaseCourseButton';

const GRAPHQL_URL =
  (import.meta.env['VITE_GRAPHQL_URL'] as string) ?? '/graphql';

const COURSE_LISTINGS_QUERY = gql`
  query CourseListings($filters: CourseListingFiltersInput) {
    courseListings(filters: $filters) {
      id
      courseId
      title
      description
      instructorName
      thumbnailUrl
      price
      currency
      priceCents
      tags
      enrollmentCount
      rating
      isPublished
      revenueSplitPercent
    }
    myPurchases {
      courseId
      status
    }
  }
`;

interface CourseListing {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  instructorName: string;
  thumbnailUrl: string | null;
  price: number | null;
  currency: string | null;
  priceCents: number;
  tags: string[];
  enrollmentCount: number;
  rating: number | null;
  isPublished: boolean;
  revenueSplitPercent: number;
}

interface MyPurchase {
  courseId: string;
  status: string;
}

interface ListingsData {
  courseListings: CourseListing[];
  myPurchases: MyPurchase[];
}

interface CourseListingFilters {
  search?: string;
  priceMax?: number;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function MarketplacePage() {
  const [mounted, setMounted] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [priceFilter, setPriceFilter] = useState<'any' | 'free' | 'under25' | 'under50'>('any');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  const filters: CourseListingFilters = {
    search: debouncedSearch || undefined,
    priceMax:
      priceFilter === 'free' ? 0
      : priceFilter === 'under25' ? 25
      : priceFilter === 'under50' ? 50
      : undefined,
  };

  const { data, isLoading, error } = useQuery<ListingsData>({
    queryKey: ['marketplace-listings', filters],
    queryFn: () =>
      request<ListingsData>(GRAPHQL_URL, COURSE_LISTINGS_QUERY, { filters }),
    enabled: mounted,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        Failed to load marketplace listings.
      </div>
    );
  }

  const purchasedCourseIds = new Set(
    (data?.myPurchases ?? [])
      .filter((p) => p.status === 'COMPLETE')
      .map((p) => p.courseId)
  );

  const listings = data?.courseListings ?? [];

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Course Marketplace</h1>
        <p className="text-muted-foreground mb-6">
          Browse and purchase courses from expert instructors.
        </p>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <select
            value={priceFilter}
            onChange={(e) =>
              setPriceFilter(e.target.value as 'any' | 'free' | 'under25' | 'under50')
            }
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="any">Any price</option>
            <option value="free">Free</option>
            <option value="under25">Under $25</option>
            <option value="under50">Under $50</option>
          </select>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No courses available yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const isPurchased = purchasedCourseIds.has(listing.courseId);
              return (
                <Card key={listing.id} className="flex flex-col">
                  {listing.thumbnailUrl && (
                    <img
                      src={listing.thumbnailUrl}
                      alt={listing.title}
                      className="w-full h-40 object-cover rounded-t-md"
                    />
                  )}
                  <CardHeader>
                    <CardTitle className="text-base line-clamp-2">
                      {listing.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {listing.instructorName}
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {listing.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {listing.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-primary">
                        {listing.priceCents === 0
                          ? 'Free'
                          : formatPrice(listing.priceCents, listing.currency ?? 'USD')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Instructor earns {listing.revenueSplitPercent}% of each sale
                    </p>
                  </CardContent>
                  <CardFooter>
                    {isPurchased ? (
                      <Badge
                        variant="secondary"
                        className="w-full justify-center py-2"
                      >
                        Purchased
                      </Badge>
                    ) : (
                      <PurchaseCourseButton
                        courseId={listing.courseId}
                        priceCents={listing.priceCents}
                        currency={listing.currency ?? 'USD'}
                      />
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
