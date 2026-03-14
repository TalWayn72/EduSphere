/**
 * PartnerDashboardPage — Partner revenue + API key dashboard.
 * Route: /partner/dashboard (protected)
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PartnerTierBadge } from '@/components/partners/PartnerTierBadge';
import { PartnerRevenueTable } from '@/components/partners/PartnerRevenueTable';
import { ApiKeySection } from '@/components/partners/ApiKeySection';

const PARTNER_DASHBOARD_QUERY = `
  query PartnerDashboard {
    myPartnerDashboard {
      status
      apiKey
      revenueByMonth {
        month
        grossRevenue
        platformCut
        payout
        status
      }
    }
  }
`;

const REGENERATE_KEY_MUTATION = `
  mutation RegeneratePartnerApiKey {
    regeneratePartnerApiKey { apiKey }
  }
`;

interface RevenueRow {
  month: string;
  grossRevenue: number;
  platformCut: number;
  payout: number;
  status: 'PAID' | 'PENDING' | 'PROCESSING';
}

interface PartnerDashboardData {
  status: string;
  apiKey: string;
  revenueByMonth: RevenueRow[];
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

export function PartnerDashboardPage() {
  usePageTitle('Partner Dashboard');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery<{ myPartnerDashboard: PartnerDashboardData }>({
    query: PARTNER_DASHBOARD_QUERY,
    pause: !mounted,
  });

  const [regenResult, regenerateKey] = useMutation(REGENERATE_KEY_MUTATION);

  const { data, fetching, error } = result;
  const dashboard = data?.myPartnerDashboard;
  const partnerStatus = dashboard?.status ?? 'ACTIVE';
  const revenue = dashboard?.revenueByMonth ?? [];
  const apiKey = dashboard?.apiKey ?? '';
  const newKey = regenResult.data?.regeneratePartnerApiKey?.apiKey as string | undefined;

  return (
    <AdminLayout title="Partner Dashboard" description="Revenue analytics and API access for EduSphere Partners">
      <div data-testid="partner-dashboard-page">
        {fetching && (
          <div className="space-y-4" data-testid="partner-skeleton" role="status" aria-label="Loading partner dashboard">
            <span className="sr-only">Loading partner dashboard data...</span>
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        )}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm" role="alert">
              <p className="font-semibold mb-1">Unable to load partner data</p>
              <p>Please check your connection and try again later.</p>
            </CardContent>
          </Card>
        )}

        {!fetching && !error && !dashboard && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm" data-testid="empty-state">No partner account found.</p>
            </CardContent>
          </Card>
        )}

        {!fetching && dashboard && (
          <>
            <Card className="mb-6">
              <CardHeader><CardTitle>Partner Status</CardTitle></CardHeader>
              <CardContent>
                <span
                  data-testid="partner-status-badge"
                  className={`inline-flex items-center rounded px-3 py-1 text-sm font-semibold ${STATUS_BADGE[partnerStatus] ?? 'bg-gray-100 text-gray-800'}`}
                >
                  {partnerStatus}
                </span>
                <div className="mt-3"><PartnerTierBadge tier="GOLD" /></div>
              </CardContent>
            </Card>

            <PartnerRevenueTable revenue={revenue} />

            <ApiKeySection
              currentKey={newKey ?? apiKey}
              showPlain={!!newKey}
              onRegenerate={() => void regenerateKey({})}
              regenerating={regenResult.fetching}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
