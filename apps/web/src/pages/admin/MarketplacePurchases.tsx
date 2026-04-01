/**
 * MarketplacePurchases — Purchase history with refund capability.
 * Route: /admin/marketplace/purchases
 *
 * Shows a table of purchases with status badges.
 * Refund button appears only within 14-day window for COMPLETED purchases.
 */
/* eslint-disable edusphere-design-system/require-page-header -- h1 rendered by AdminLayout */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const PURCHASES_QUERY = `
  query Purchases($limit: Int, $offset: Int) {
    purchases(limit: $limit, offset: $offset) {
      id listingId courseTitle price status createdAt
    }
  }
`;

const REFUND_MUTATION = `
  mutation RequestRefund($purchaseId: ID!) {
    requestRefund(purchaseId: $purchaseId) {
      id status
    }
  }
`;

interface PurchaseItem {
  id: string;
  listingId: string;
  courseTitle: string;
  price: number;
  status: string;
  createdAt: string;
}

const REFUND_WINDOW_DAYS = 14;

function isRefundable(purchase: PurchaseItem): boolean {
  if (purchase.status !== 'COMPLETED') return false;
  const purchaseDate = new Date(purchase.createdAt);
  const deadline = new Date(purchaseDate);
  deadline.setDate(deadline.getDate() + REFUND_WINDOW_DAYS);
  return new Date() < deadline;
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'COMPLETED':
      return 'default';
    case 'PENDING':
      return 'secondary';
    case 'REFUNDED':
      return 'outline';
    case 'FAILED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function MarketplacePurchases() {
  const { t } = useTranslation('orgMarketplace');
  const [mounted, setMounted] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }, reexecute] = useQuery<{
    purchases: PurchaseItem[];
  }>({
    query: PURCHASES_QUERY,
    variables: { limit: 50, offset: 0 },
    pause: !mounted,
  });

  const [, executeRefund] = useMutation<{
    requestRefund: { id: string; status: string };
  }>(REFUND_MUTATION);

  const handleRefund = async (purchaseId: string) => {
    setRefundingId(purchaseId);
    try {
      await executeRefund({ purchaseId });
      reexecute({ requestPolicy: 'network-only' });
    } finally {
      setRefundingId(null);
    }
  };

  const purchases = data?.purchases ?? [];

  return (
    <AdminLayout
      title={t('marketplace.purchasesTitle', 'Purchase History')}
      description={t(
        'marketplace.purchasesDescription',
        'View and manage your marketplace purchases.'
      )}
    >
      <div data-testid="marketplace-purchases-page" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('marketplace.purchasesTableTitle', 'Purchases')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : purchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {t('marketplace.noPurchases', 'No purchases yet.')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="purchases-table">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-3 font-medium">
                        {t('marketplace.course', 'Course')}
                      </th>
                      <th className="py-2 px-3 font-medium">
                        {t('marketplace.price', 'Price')}
                      </th>
                      <th className="py-2 px-3 font-medium">
                        {t('marketplace.status', 'Status')}
                      </th>
                      <th className="py-2 px-3 font-medium">
                        {t('marketplace.date', 'Date')}
                      </th>
                      <th className="py-2 px-3 font-medium">
                        {t('marketplace.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="border-b last:border-0"
                        data-testid={`purchase-row-${purchase.id}`}
                      >
                        <td className="py-3 px-3">
                          {purchase.courseTitle || purchase.listingId}
                        </td>
                        <td className="py-3 px-3">
                          ${purchase.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={statusVariant(purchase.status)}>
                            {purchase.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          {isRefundable(purchase) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={refundingId === purchase.id}
                              onClick={() => handleRefund(purchase.id)}
                              data-testid={`refund-btn-${purchase.id}`}
                            >
                              {refundingId === purchase.id
                                ? t('marketplace.refunding', 'Refunding...')
                                : t('marketplace.refund', 'Refund')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
