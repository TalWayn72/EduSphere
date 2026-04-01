/**
 * AdminOverviewPage — Dashboard with tenant metrics cards.
 * Route: /admin/overview
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const TENANT_METRICS_QUERY = `
  query TenantMetrics {
    tenantMetrics {
      totalUsers
      activeCourses
      storageUsedMb
      monthlyActiveUsers
    }
  }
`;

export interface TenantMetrics {
  totalUsers: number;
  activeCourses: number;
  storageUsedMb: number;
  monthlyActiveUsers: number;
}

interface MetricCardProps {
  testId: string;
  title: string;
  value: string | number;
  description: string;
}

function MetricCard({ testId, title, value, description }: MetricCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricsSkeleton() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-testid="overview-skeleton"
    >
      <h1 className="sr-only">Admin Overview</h1>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminOverviewPage() {
  const { t } = useTranslation('admin');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [result] = useQuery<{ tenantMetrics: TenantMetrics }>({
    query: TENANT_METRICS_QUERY,
    pause: !mounted,
  });

  const { data, fetching, error } = result;
  const metrics = data?.tenantMetrics;

  return (
    <AdminLayout
      title={t('overview.title')}
      description={t('overview.description')}
    >
      <div data-testid="admin-overview-page" className="space-y-6">
        <Badge
          variant="outline"
          className="border-yellow-400 text-yellow-700 dark:border-yellow-500 dark:text-yellow-300"
        >
          BETA
        </Badge>

        {fetching && <MetricsSkeleton />}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              {t('overview.loadError')}
            </CardContent>
          </Card>
        )}

        {metrics && !fetching && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              testId="metric-total-users"
              title={t('stats.totalUsers')}
              value={metrics.totalUsers.toLocaleString()}
              description={t('overview.registeredUsers')}
            />
            <MetricCard
              testId="metric-active-courses"
              title={t('overview.activeCourses')}
              value={metrics.activeCourses.toLocaleString()}
              description={t('overview.publishedCourses')}
            />
            <MetricCard
              testId="metric-storage-used"
              title={t('stats.storageUsed')}
              value={`${(metrics.storageUsedMb / 1024).toFixed(1)} GB`}
              description={t('overview.totalStorage')}
            />
            <MetricCard
              testId="metric-monthly-active-users"
              title={t('overview.monthlyActiveUsers')}
              value={metrics.monthlyActiveUsers.toLocaleString()}
              description={t('overview.usersLast30Days')}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
