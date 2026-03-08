/**
 * TenantAnalyticsPage — Tenant-level analytics dashboard for ORG_ADMIN / SUPER_ADMIN.
 * Route: /admin/analytics
 * Shows KPI cards, trend charts, cohort retention, and CSV export.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthRole } from '@/hooks/useAuthRole';
import { TenantAnalyticsCharts } from './TenantAnalyticsPage.charts';
import { CohortRetentionTable } from './TenantAnalyticsPage.cohort';
import { ExportAnalyticsButton } from './TenantAnalyticsPage.export';
import {
  TENANT_ANALYTICS_QUERY,
  COHORT_RETENTION_QUERY,
} from '@/lib/graphql/tenant-analytics.queries';

type Period = 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'NINETY_DAYS';

const PERIOD_LABELS: Record<Period, string> = {
  SEVEN_DAYS: '7 Days',
  THIRTY_DAYS: '30 Days',
  NINETY_DAYS: '90 Days',
};

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export function TenantAnalyticsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [period, setPeriod] = useState<Period>('THIRTY_DAYS');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [analyticsResult] = useQuery({
    query: TENANT_ANALYTICS_QUERY,
    variables: { period },
    pause: !mounted,
  });

  const [cohortResult] = useQuery({
    query: COHORT_RETENTION_QUERY,
    pause: !mounted,
  });

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const analytics = analyticsResult.data?.tenantAnalytics;
  const cohort = cohortResult.data?.cohortRetention ?? [];
  const fetching = analyticsResult.fetching || cohortResult.fetching;
  const error = analyticsResult.error ?? cohortResult.error;

  return (
    <AdminLayout title="Tenant Analytics" description="Platform-wide learning analytics">
      {/* Period selector */}
      <div className="flex items-center justify-between mb-6">
        <nav role="tablist" aria-label="Analytics period" className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </nav>
        <ExportAnalyticsButton period={period} />
      </div>

      {/* KPI summary cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Enrollments</p>
              <p className="text-2xl font-bold">{analytics.totalEnrollments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Avg Learning Velocity</p>
              <p className="text-2xl font-bold">
                {(analytics.avgLearningVelocity ?? 0).toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">les/wk</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {fetching && (
        <div className="flex items-center justify-center py-16" aria-label="Loading analytics">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Error */}
      {error && !fetching && (
        <Card>
          <CardContent className="py-8 text-center text-destructive text-sm">
            Failed to load analytics: {error.message}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {analytics && !fetching && (
        <TenantAnalyticsCharts
          activeLearnersTrend={analytics.activeLearnersTrend ?? []}
          completionRateTrend={analytics.completionRateTrend ?? []}
          topCourses={analytics.topCourses ?? []}
        />
      )}

      {/* Cohort retention */}
      {!fetching && (
        <div className="mt-6">
          <CohortRetentionTable rows={cohort} />
        </div>
      )}
    </AdminLayout>
  );
}
