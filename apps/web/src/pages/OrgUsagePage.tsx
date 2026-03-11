/**
 * OrgUsagePage — YAU usage dashboard for ORG_ADMIN.
 * Route: /admin/usage
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { UsageMeter } from '@/components/admin/UsageMeter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthRole } from '@/hooks/useAuthRole';

const MY_TENANT_USAGE_QUERY = `
  query MyTenantUsage($year: Int) {
    myTenantUsage(year: $year) {
      tenantId
      tenantName
      plan
      yearlyActiveUsers
      monthlyActiveUsers
      seatLimit
      seatUtilizationPct
      overageUsers
    }
  }
`;

interface TenantUsage {
  tenantId: string;
  tenantName: string;
  plan: string;
  yearlyActiveUsers: number;
  monthlyActiveUsers: number;
  seatLimit: number;
  seatUtilizationPct: number;
  overageUsers: number;
}

const PLAN_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  PILOT: 'outline',
  STARTER: 'secondary',
  GROWTH: 'default',
  UNIVERSITY: 'default',
  ENTERPRISE: 'default',
};

export function OrgUsagePage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [result] = useQuery<{ myTenantUsage: TenantUsage }>({
    query: MY_TENANT_USAGE_QUERY,
    pause: !mounted,
  });

  if (role && role !== 'ORG_ADMIN' && role !== 'SUPER_ADMIN') {
    navigate('/dashboard');
    return null;
  }

  const { data, fetching, error } = result;
  const usage = data?.myTenantUsage;

  return (
    <AdminLayout title="Usage & Seats" description="Your organization's yearly active user utilization">
      <div data-testid="org-usage-page">
        {fetching && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-48 rounded-full mx-auto" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              Failed to load usage data: {error.message}
            </CardContent>
          </Card>
        )}

        {usage && !fetching && (
          <>
            {/* Overage callout */}
            {usage.overageUsers > 0 && (
              <Card
                data-testid="overage-callout"
                className="mb-6 border-destructive bg-destructive/5"
              >
                <CardContent className="py-4 text-sm text-destructive font-medium">
                  You have {usage.overageUsers} users over your {usage.seatLimit}-seat limit.
                  Contact us to upgrade.
                </CardContent>
              </Card>
            )}

            {/* Plan badge + title */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-semibold">{usage.tenantName}</h2>
              <Badge variant={PLAN_VARIANT[usage.plan] ?? 'outline'}>
                {usage.plan}
              </Badge>
            </div>

            {/* Meter */}
            <div className="flex justify-center mb-8">
              <UsageMeter
                current={usage.yearlyActiveUsers}
                limit={usage.seatLimit}
                label="Yearly Active Users"
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">YAU</p>
                  <p className="text-2xl font-bold">{usage.yearlyActiveUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Monthly Active</p>
                  <p className="text-2xl font-bold">{usage.monthlyActiveUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Seat Limit</p>
                  <p className="text-2xl font-bold">{usage.seatLimit}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Utilization</p>
                  <p className="text-2xl font-bold">{usage.seatUtilizationPct}%</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
