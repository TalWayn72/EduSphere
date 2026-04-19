/**
 * AdminDashboardPage — Platform overview for ORG_ADMIN / SUPER_ADMIN.
 * Route: /admin
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { AdminActivityFeed } from '@/components/AdminActivityFeed';
import { useAuthRole } from '@/hooks/useAuthRole';
import { AdminStatCards } from '@/components/admin/AdminStatCards';
import { AdminQuickLinksGrid } from '@/components/admin/AdminQuickLinksGrid';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const ADMIN_OVERVIEW_QUERY = `
  query AdminOverview {
    adminOverview {
      totalUsers
      activeUsersThisMonth
      totalCourses
      completionsThisMonth
      atRiskCount
      lastScimSync
      lastComplianceReport
      storageUsedMb
    }
  }
`;

export interface AdminOverviewData {
  totalUsers: number;
  activeUsersThisMonth: number;
  totalCourses: number;
  completionsThisMonth: number;
  atRiskCount: number;
  lastScimSync: string | null;
  lastComplianceReport: string | null;
  storageUsedMb: number;
}

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const { t } = useTranslation('admin');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [result] = useQuery<{ adminOverview: AdminOverviewData }>({
    query: ADMIN_OVERVIEW_QUERY,
    pause: !mounted,
  });

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const { data, fetching, error } = result;

  return (
    <AdminLayout>
      <PageShell size="2xl">
        <PageHeader
          title={t('dashboard.title')}
          description={t('dashboard.description')}
        />
        {fetching && <LoadingSpinner containerHeight="py-16" />}

        {error && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              {t('dashboard.loadError')}
            </CardContent>
          </Card>
        )}

        {data && <AdminStatCards overview={data.adminOverview} />}

        {/* All Admin Quick Links — grouped by functional area */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">
            {t('dashboard.adminTools')}
          </h2>
          <AdminQuickLinksGrid />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">
            {t('dashboard.recentActivity')}
          </h2>
          <AdminActivityFeed loading={fetching} />
        </div>
      </PageShell>
    </AdminLayout>
  );
}
