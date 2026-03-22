/**
 * BillingPage — Subscription management with Stripe checkout + portal.
 * Route: /admin/billing
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const SUBSCRIPTION_QUERY = `
  query TenantSubscription {
    tenantSubscription {
      planName
      status
      currentPeriodEnd
      yauUsed
      yauLimit
      priceFormatted
      billingPeriod
    }
  }
`;

const CREATE_PORTAL_SESSION = `
  mutation CreateBillingPortalSession {
    createBillingPortalSession { url }
  }
`;

const CREATE_CHECKOUT = `
  mutation CreateCheckoutSession($planId: ID!) {
    createCheckoutSession(planId: $planId) { url }
  }
`;

interface SubscriptionData {
  planName: string;
  status: string;
  currentPeriodEnd: string;
  yauUsed: number;
  yauLimit: number;
  priceFormatted: string;
  billingPeriod: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trialing: 'bg-blue-100 text-blue-800',
  past_due: 'bg-yellow-100 text-yellow-800',
  canceled: 'bg-red-100 text-red-800',
};

export function BillingPage() {
  const { t } = useTranslation('orgAdmin');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching }] = useQuery<{ tenantSubscription: SubscriptionData }>({
    query: SUBSCRIPTION_QUERY,
    pause: !mounted,
  });
  const [, createPortal] = useMutation(CREATE_PORTAL_SESSION);
  const [, createCheckout] = useMutation(CREATE_CHECKOUT);

  const sub = data?.tenantSubscription;
  const yauPercent = sub ? Math.round((sub.yauUsed / sub.yauLimit) * 100) : 0;

  const handlePortal = async () => {
    const result = await createPortal({});
    const url = result.data?.createBillingPortalSession?.url;
    if (url) window.location.href = url;
  };

  const handleUpgrade = async (planId: string) => {
    const result = await createCheckout({ planId });
    const url = result.data?.createCheckoutSession?.url;
    if (url) window.location.href = url;
  };

  return (
    <AdminLayout title={t('billing.title')} description={t('billing.description')}>
      <h1 className="sr-only">Billing</h1>
      <div data-testid="billing-page" className="space-y-6">
        {fetching ? (
          <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ) : sub ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('billing.currentPlan')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{sub.planName}</p>
                    <p className="text-sm text-muted-foreground">
                      {sub.priceFormatted} / {sub.billingPeriod}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[sub.status] ?? ''}>
                    {sub.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{t('billing.yauUsage')}</span>
                    <span>{sub.yauUsed.toLocaleString()} / {sub.yauLimit.toLocaleString()}</span>
                  </div>
                  <Progress value={yauPercent} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('billing.renewsOn', { date: new Date(sub.currentPeriodEnd).toLocaleDateString() })}
                </p>
                <Button variant="outline" onClick={handlePortal}>
                  {t('billing.manageSubscription')}
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].map((plan) => (
                <Card key={plan} className={plan === sub.planName ? 'border-primary' : ''}>
                  <CardContent className="p-4 text-center space-y-3">
                    <p className="font-semibold">{plan}</p>
                    <Button
                      variant={plan === sub.planName ? 'secondary' : 'default'}
                      size="sm"
                      disabled={plan === sub.planName}
                      onClick={() => handleUpgrade(plan.toLowerCase())}
                    >
                      {plan === sub.planName ? t('billing.currentPlanBadge') : t('billing.upgrade')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t('billing.noSubscription')}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
