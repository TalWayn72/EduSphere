/**
 * ROIAnalyticsDashboardPage — ROI analytics for ORG_ADMIN / SUPER_ADMIN.
 * Route: /admin/roi-analytics
 * Calculates estimated value saved via AI productivity gains + cost per active user.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';
import { KpiGrid, CostPerUser } from './ROIAnalyticsDashboardPage.kpi';

// ── GraphQL ───────────────────────────────────────────────────────────────────
const TENANT_ROI_METRICS = `
  query TenantROIMetrics($year: Int) {
    myTenantUsage(year: $year) {
      tenantId
      tenantName
      plan
      yearlyActiveUsers
      seatLimit
      seatUtilizationPct
      monthlyActiveUsers
    }
  }
`;

// ── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
/** avg hours of content created per user per year */
const AVG_HRS_PER_USER = 340;
/** AI saves 60% of creation time */
const AI_PRODUCTIVITY_FACTOR = 0.6;
/** average hourly rate (USD) */
const HOURLY_RATE = 85;

function calcEstimatedValue(yau: number): number {
  return yau * AVG_HRS_PER_USER * AI_PRODUCTIVITY_FACTOR * HOURLY_RATE;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-label="Loading ROI analytics" className="space-y-6">
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
          <div className="h-8 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ROIAnalyticsDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery({
    query: TENANT_ROI_METRICS,
    pause: !mounted,
  });

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const usage = result.data?.myTenantUsage;
  const fetching = result.fetching;
  const error = result.error;

  const yau = usage?.yearlyActiveUsers ?? 0;
  const estimatedValue = calcEstimatedValue(yau);

  function handleExportPdf() {
    window.print();
  }

  return (
    <AdminLayout title="ROI Analytics" description="Return on investment from AI-powered learning">
      <div data-testid="roi-dashboard-page">
        {fetching && <LoadingSkeleton />}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              Failed to load ROI data: {error.message}
            </CardContent>
          </Card>
        )}

        {usage && !fetching && (
          <>
            {/* Section 1 — ROI Summary */}
            <Card data-testid="roi-summary-card" className="mb-6">
              <CardHeader>
                <CardTitle>ROI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">
                  Estimated Value: ${estimatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on {yau.toLocaleString()} active users × 60% AI productivity gain
                </p>
              </CardContent>
            </Card>

            {/* Section 2 — KPI Grid */}
            <KpiGrid
              yearlyActiveUsers={usage.yearlyActiveUsers}
              monthlyActiveUsers={usage.monthlyActiveUsers}
              seatUtilizationPct={usage.seatUtilizationPct}
              plan={usage.plan}
            />

            {/* Section 3 — Cost Per Active User */}
            <CostPerUser
              plan={usage.plan}
              yearlyActiveUsers={usage.yearlyActiveUsers}
            />

            {/* Section 4 — PDF Export */}
            <div className="flex justify-end mt-4">
              <Button
                data-testid="export-roi-pdf-btn"
                onClick={handleExportPdf}
                variant="outline"
              >
                Download ROI Report (PDF)
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
