/**
 * ContentMarketplace — Marketplace browse UI with filtering, search, and cart.
 *
 * Displays available courses for org licensing with category filters,
 * search, a shopping cart sidebar, and checkout integration.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  useContentMarketplace,
  type MarketplaceItem,
} from '@/hooks/useContentMarketplace';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';

function ItemCard({
  item,
  isInCart,
  onAdd,
}: {
  item: MarketplaceItem;
  isInCart: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation('orgMarketplace');
  const priceLabel =
    item.priceUsdCents === 0
      ? t('marketplace.free', 'Free')
      : `$${(item.priceUsdCents / 100).toFixed(2)}`;

  return (
    <div data-testid={`item-${item.id}`} className="rounded-lg border p-4 space-y-2">
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="h-32 w-full rounded object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
          {t('marketplace.noImage', 'No preview')}
        </div>
      )}
      <h3 className="font-medium text-sm">{item.title}</h3>
      <p className="text-xs text-muted-foreground">{item.description}</p>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{priceLabel}</span>
        <span className="text-xs text-muted-foreground">
          {item.rating.toFixed(1)} / 5
        </span>
      </div>
      <button
        onClick={onAdd}
        disabled={isInCart}
        className="w-full rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {isInCart
          ? 'In Cart'
          : t('marketplace.addToOrg', 'Add to Org')}
      </button>
    </div>
  );
}

function CartSidebar({
  cart,
  cartTotal,
  onRemove,
  onCheckout,
  checkoutStatus,
}: {
  cart: { itemId: string; title: string; priceUsdCents: number }[];
  cartTotal: number;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  checkoutStatus: string;
}) {
  if (cart.length === 0) return null;

  return (
    <div
      data-testid="cart-sidebar"
      className="rounded-lg border p-4 space-y-3"
    >
      <h3 className="font-medium text-sm">Cart ({cart.length})</h3>
      <ul role="list" className="space-y-2">
        {cart.map((ci) => (
          <li key={ci.itemId} className="flex items-center justify-between text-sm">
            <span className="truncate">{ci.title}</span>
            <div className="flex items-center gap-2">
              <span>${(ci.priceUsdCents / 100).toFixed(2)}</span>
              <button
                onClick={() => onRemove(ci.itemId)}
                aria-label={`Remove ${ci.title}`}
                className="text-red-500 dark:text-red-400 text-xs hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t pt-2 flex items-center justify-between">
        <span className="font-semibold text-sm">
          Total: ${(cartTotal / 100).toFixed(2)}
        </span>
        <button
          onClick={onCheckout}
          disabled={checkoutStatus === 'creating' || checkoutStatus === 'redirecting'}
          className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {checkoutStatus === 'creating' ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    </div>
  );
}

export function ContentMarketplace() {
  const { t } = useTranslation('orgMarketplace');
  const {
    filteredItems,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    cart,
    cartTotal,
    addToCart,
    removeFromCart,
    isInCart,
  } = useContentMarketplace();

  const { status: checkoutStatus, createCheckoutSession } =
    useStripeCheckout();

  const handleCheckout = () => {
    const lineItems = cart.map((ci) => ({
      itemId: ci.itemId,
      title: ci.title,
      priceUsdCents: ci.priceUsdCents,
      quantity: 1,
    }));
    void createCheckoutSession(lineItems);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            className="h-64 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {t('marketplace.title', 'Content Marketplace')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('marketplace.description', 'Browse and license courses')}
        </p>
      </div>

      <div className="flex gap-3">
        <input
          type="search"
          role="searchbox"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            'marketplace.searchPlaceholder',
            'Search courses...'
          )}
          aria-label={t('marketplace.searchLabel', 'Search marketplace')}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <select
          aria-label={t('marketplace.categoryLabel', 'Filter by category')}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">
            {t('marketplace.categories.all', 'All Categories')}
          </option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {t(`marketplace.categories.${cat}`, cat)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {filteredItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {t('marketplace.noResults', 'No courses found')}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isInCart={isInCart(item.id)}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-72 shrink-0">
          <CartSidebar
            cart={cart}
            cartTotal={cartTotal}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            checkoutStatus={checkoutStatus}
          />
        </div>
      </div>
    </div>
  );
}
