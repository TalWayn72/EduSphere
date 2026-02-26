/**
 * AdminDashboardPage — Platform overview for ORG_ADMIN / SUPER_ADMIN.
 * Route: /admin
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const QUICK_LINKS = [
  {
    to: '/admin/branding',
    icon: Palette,
    label: 'Branding',
    desc: 'Logos, colors, themes',
  },
  {
    to: '/admin/users',
    icon: Users,
    label: 'Users',
    desc: 'Manage learners and admins',
  },
  {
    to: '/admin/compliance',
    icon: ClipboardCheck,
    label: 'Compliance',
    desc: 'Reports and deadlines',
  },
  {
    to: '/admin/gamification',
    icon: Trophy,
    label: 'Gamification',
    desc: 'Points, badges, leaderboards',
  },
  {
    to: '/admin/security',
    icon: Lock,
    label: 'Security',
    desc: 'MFA, SSO, session policy',
  },
  {
    to: '/admin/audit',
    icon: ScrollText,
    label: 'Audit Log',
    desc: 'Admin action history',
  },
];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();

  const [result] = useQuery<{ adminOverview: AdminOverviewData }>({
    query: ADMIN_OVERVIEW_QUERY,
  });

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const { data, fetching, error } = result;

  return (
    <AdminLayout
      title="Admin Dashboard"
      description="Platform overview and key metrics"
    >
      {fetching && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive text-sm">
            Failed to load dashboard data: {error.message}
          </CardContent>
        </Card>
      )}

      {data && <AdminStatCards overview={data.adminOverview} />}

      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Admin Tools</h2>
        <div className="grid grid-cols-2 gap-4">
          {QUICK_LINKS.map(({ to, icon: Icon, label, desc }) => (
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
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recent admin activity will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
