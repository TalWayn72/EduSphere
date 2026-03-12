/**
 * PartnerDashboardPage — Partner revenue + API key dashboard.
 * Route: /partner/dashboard (protected)
 */
import React, { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PartnerTierBadge } from '@/components/partners/PartnerTierBadge';

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

interface RevenueRow {
  month: string;
  grossRevenue: number;
  platformCut: number;
  payout: number;
  status: 'PAID' | 'PENDING' | 'PROCESSING';
}

const MOCK_REVENUE: RevenueRow[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (11 - i));
  const gross = Math.round(1000 + Math.random() * 4000);
  return {
    month: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    grossRevenue: gross,
    platformCut: Math.round(gross * 0.3),
    payout: Math.round(gross * 0.7),
    status: i < 11 ? 'PAID' : 'PENDING',
  };
});

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

const ROW_STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
};

export function PartnerDashboardPage() {
  usePageTitle('Partner Dashboard');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: PARTNER_DASHBOARD_QUERY,
    pause: !mounted,
  });

  const partnerStatus = result.data?.myPartnerDashboard?.status ?? 'ACTIVE';
  const revenue: RevenueRow[] = result.data?.myPartnerDashboard?.revenueByMonth ?? MOCK_REVENUE;
  const fetching = result.fetching;

  return (
    <AdminLayout title="Partner Dashboard" description="Revenue analytics and API access for EduSphere Partners">
      <div data-testid="partner-dashboard-page">
        {fetching && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-label="Loading" />
          </div>
        )}

        {!fetching && (
          <>
            {/* Partner status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Partner Status</CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  data-testid="partner-status-badge"
                  className={`inline-flex items-center rounded px-3 py-1 text-sm font-semibold ${STATUS_BADGE[partnerStatus] ?? 'bg-gray-100 text-gray-800'}`}
                >
                  {partnerStatus}
                </span>
                <div className="mt-3">
                  <PartnerTierBadge tier="GOLD" />
                </div>
              </CardContent>
            </Card>

            {/* Revenue Table */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Revenue (Last 12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table data-testid="revenue-table" className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Month</th>
                        <th className="pb-3 pr-4 font-medium">Gross Revenue</th>
                        <th className="pb-3 pr-4 font-medium">Platform Cut (30%)</th>
                        <th className="pb-3 pr-4 font-medium">Your Payout (70%)</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.map((row) => (
                        <tr key={row.month} className="border-b hover:bg-muted/30">
                          <td className="py-3 pr-4">{row.month}</td>
                          <td className="py-3 pr-4">${row.grossRevenue.toLocaleString()}</td>
                          <td className="py-3 pr-4 text-muted-foreground">${row.platformCut.toLocaleString()}</td>
                          <td className="py-3 pr-4 font-semibold text-green-700">${row.payout.toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${ROW_STATUS_BADGE[row.status] ?? ''}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* API Key Section */}
            <Card data-testid="api-key-section">
              <CardHeader>
                <CardTitle>Your API Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded bg-muted px-4 py-2 font-mono text-sm">
                    esph_•••••••••••••••••
                  </code>
                  <Button variant="outline" size="sm" onClick={() => undefined}>
                    Regenerate
                  </Button>
                </div>
                <div className="mt-4 flex gap-4 text-sm">
                  <a href="/api/v1/partner/usage" className="text-primary underline underline-offset-2">
                    /api/v1/partner/usage
                  </a>
                  <a href="/docs/partner-api" className="text-primary underline underline-offset-2">
                    API Documentation
                  </a>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
