/**
 * MarketplaceSuccess — Checkout success landing page.
 * Route: /admin/marketplace/success?session_id=...
 */
/* eslint-disable edusphere-design-system/require-page-header -- h1 rendered by AdminLayout */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MarketplaceSuccess() {
  const { t } = useTranslation('orgMarketplace');
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <AdminLayout
      title={t('marketplace.successTitle', 'Purchase Complete')}
      description={t('marketplace.successDescription', 'Your course has been added to your organization.')}
    >
      <div data-testid="marketplace-success-page" className="max-w-lg mx-auto mt-12">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-4xl">&#10003;</div>
            <h2 className="text-xl font-semibold">
              {t('marketplace.purchaseComplete', 'Purchase Complete!')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t(
                'marketplace.successMessage',
                'The course has been licensed and will be available in your organization catalog shortly.'
              )}
            </p>
            {sessionId && (
              <p className="text-xs text-muted-foreground">
                {t('marketplace.sessionId', 'Session')}: {sessionId.slice(0, 20)}...
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild>
                <Link to="/admin/marketplace/purchases">
                  {t('marketplace.viewPurchases', 'View Purchases')}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/marketplace">
                  {t('marketplace.continueBrowsing', 'Continue Browsing')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
