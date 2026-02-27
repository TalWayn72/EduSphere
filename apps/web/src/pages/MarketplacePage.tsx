import React from 'react';
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
  query CourseListings {
    courseListings {
      id
      courseId
      priceCents
      currency
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
  priceCents: number;
  currency: string;
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

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function MarketplacePage() {
  const { data, isLoading, error } = useQuery<ListingsData>({
    queryKey: ['marketplace-listings'],
    queryFn: () => request<ListingsData>(GRAPHQL_URL, COURSE_LISTINGS_QUERY),
    enabled: false, // courseListings not in live gateway
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
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Course Marketplace</h1>
      <p className="text-muted-foreground mb-6">
        Browse and purchase courses from expert instructors.
      </p>

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
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">
                    Course {listing.courseId.slice(0, 8)}...
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-primary">
                      {listing.priceCents === 0
                        ? 'Free'
                        : formatPrice(listing.priceCents, listing.currency)}
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
                      currency={listing.currency}
                    />
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
