/**
 * AdminDashboardPage — Platform overview for ORG_ADMIN / SUPER_ADMIN.
 * Route: /admin
 */
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthRole } from '@/hooks/useAuthRole';
import { AdminStatCards } from '@/components/admin/AdminStatCards';
import {
  Palette,
  Users,
  ClipboardCheck,
  Trophy,
  Lock,
  ScrollText,
} from 'lucide-react';

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

  const [result] = useQuery<{ adminOverview: AdminOverviewData }>({
    query: ADMIN_OVERVIEW_QUERY,
    pause: true, // adminOverview not in live gateway
  });

  const quickLinks = useMemo(
    () => [
      {
        to: '/admin/branding',
        icon: Palette,
        label: t('dashboard.quickLinks.branding.label'),
        desc: t('dashboard.quickLinks.branding.desc'),
      },
      {
        to: '/admin/users',
        icon: Users,
        label: t('dashboard.quickLinks.users.label'),
        desc: t('dashboard.quickLinks.users.desc'),
      },
      {
        to: '/admin/compliance',
        icon: ClipboardCheck,
        label: t('dashboard.quickLinks.compliance.label'),
        desc: t('dashboard.quickLinks.compliance.desc'),
      },
      {
        to: '/admin/gamification',
        icon: Trophy,
        label: t('dashboard.quickLinks.gamification.label'),
        desc: t('dashboard.quickLinks.gamification.desc'),
      },
      {
        to: '/admin/security',
        icon: Lock,
        label: t('dashboard.quickLinks.security.label'),
        desc: t('dashboard.quickLinks.security.desc'),
      },
      {
        to: '/admin/audit',
        icon: ScrollText,
        label: t('dashboard.quickLinks.auditLog.label'),
        desc: t('dashboard.quickLinks.auditLog.desc'),
      },
    ],
    [t]
  );

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const { data, fetching, error } = result;

  return (
    <AdminLayout
      title={t('dashboard.title')}
      description={t('dashboard.description')}
    >
      {fetching && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive text-sm">
            {t('dashboard.loadError')}: {error.message}
          </CardContent>
        </Card>
      )}

      {data && <AdminStatCards overview={data.adminOverview} />}

      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">{t('dashboard.adminTools')}</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickLinks.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="flex items-start gap-3 py-4">
                  <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">{t('dashboard.recentActivity')}</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.activityFeed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noActivity')}
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
