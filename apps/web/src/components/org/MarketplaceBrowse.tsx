/**
 * MarketplaceBrowse — Browse and license courses from the marketplace.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarketplace } from '@/hooks/useMarketplace';

export function MarketplaceBrowse() {
  const { t } = useTranslation('org');
  const { listings, isLoading, licenseCourse, categories } = useMarketplace();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            className="h-48 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('orgOnboarding.noListings')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="search"
          role="searchbox"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            'orgOnboarding.searchPlaceholder',
            'Search courses...'
          )}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <select
          role="combobox"
          aria-label="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">
            {t('orgOnboarding.allCategories', 'All Categories')}
          </option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <div key={listing.id} className="rounded-lg border p-4 space-y-2">
            <h3 className="font-medium">{listing.title}</h3>
            <p className="text-sm text-muted-foreground">{listing.category}</p>
            <p className="text-sm">{listing.instructor}</p>
            <p className="font-semibold">
              ${(listing.priceUsdCents / 100).toFixed(2)}
            </p>
            <button
              onClick={() => licenseCourse(listing.id)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              {t('orgOnboarding.license', 'License')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
