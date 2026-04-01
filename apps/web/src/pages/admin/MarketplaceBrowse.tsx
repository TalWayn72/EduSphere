/**
 * MarketplaceBrowse — Course catalog card grid + filters.
 * Route: /admin/marketplace
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const MARKETPLACE_QUERY = `
  query MarketplaceListings($filter: MarketplaceFilter) {
    marketplaceListings(filter: $filter) {
      items {
        id title description priceUsdCents category
        rating reviewCount thumbnailUrl instructorName
      }
      totalCount
    }
  }
`;

const CREATE_CHECKOUT_SESSION_MUTATION = `
  mutation CreateCheckoutSession($listingId: ID!) {
    createCheckoutSession(listingId: $listingId) {
      sessionUrl
      sessionId
    }
  }
`;

interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  priceUsdCents: number;
  category: string;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  instructorName: string;
}

const CATEGORIES = [
  'all',
  'technology',
  'business',
  'design',
  'science',
  'humanities',
  'compliance',
] as const;

function CourseCard({
  course,
  t,
  onCheckout,
  isCheckingOut,
}: {
  course: MarketplaceListing;
  t: (k: string) => string;
  onCheckout: (listingId: string) => void;
  isCheckingOut: boolean;
}) {
  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow"
      data-testid={`course-card-${course.id}`}
    >
      <div className="aspect-video bg-muted relative">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('marketplace.noImage')}
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2">{course.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {course.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">
            {course.priceUsdCents === 0
              ? t('marketplace.free')
              : `$${(course.priceUsdCents / 100).toFixed(2)}`}
          </span>
          <Badge variant="secondary" className="text-xs">
            {course.category}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{course.instructorName}</span>
          <span>
            {'★'.repeat(Math.round(course.rating))} ({course.reviewCount})
          </span>
        </div>
        <Button
          size="sm"
          className="w-full mt-2"
          disabled={isCheckingOut}
          onClick={() => onCheckout(course.id)}
          data-testid={`checkout-btn-${course.id}`}
        >
          {isCheckingOut
            ? t('marketplace.processing')
            : t('marketplace.addToOrg')}
        </Button>
      </CardContent>
    </Card>
  );
}

export function MarketplaceBrowse() {
  const { t } = useTranslation('orgMarketplace');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<{
    marketplaceListings: { items: MarketplaceListing[]; totalCount: number };
  }>({
    query: MARKETPLACE_QUERY,
    variables: {
      filter: {
        search: search || undefined,
        category: category === 'all' ? undefined : category,
      },
    },
    pause: !mounted,
  });

  const [, executeCheckout] = useMutation<{
    createCheckoutSession: { sessionUrl: string; sessionId: string };
  }>(CREATE_CHECKOUT_SESSION_MUTATION);

  const handleCheckout = useCallback(
    async (listingId: string) => {
      setCheckingOutId(listingId);
      try {
        const result = await executeCheckout({ listingId });
        if (result.data?.createCheckoutSession?.sessionUrl) {
          window.location.href = result.data.createCheckoutSession.sessionUrl;
        }
      } finally {
        setCheckingOutId(null);
      }
    },
    [executeCheckout]
  );

  const listings = data?.marketplaceListings?.items ?? [];

  return (
    <AdminLayout
      title={t('marketplace.title')}
      description={t('marketplace.description')}
    >
      <div data-testid="marketplace-browse-page" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t('marketplace.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
            aria-label={t('marketplace.searchLabel')}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="w-48"
              aria-label={t('marketplace.categoryLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`marketplace.categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {fetching ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              {t('marketplace.noResults')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                t={t}
                onCheckout={handleCheckout}
                isCheckingOut={checkingOutId === course.id}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
