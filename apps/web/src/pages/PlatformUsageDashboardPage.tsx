/**
 * PlatformUsageDashboardPage — YAU dashboard for SUPER_ADMIN across all tenants.
 * Route: /admin/platform-usage
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthRole } from '@/hooks/useAuthRole';

const PLATFORM_USAGE_QUERY = `
  query PlatformUsageOverview($year: Int) {
    platformUsageOverview(year: $year) {
      tenantId
      tenantName
      plan
      yearlyActiveUsers
      seatLimit
      seatUtilizationPct
      overageUsers
      monthlyActiveUsers
    }
  }
`;

interface TenantRow {
  tenantId: string;
  tenantName: string;
  plan: string;
  yearlyActiveUsers: number;
  seatLimit: number;
  seatUtilizationPct: number;
  overageUsers: number;
  monthlyActiveUsers: number;
}

function statusEmoji(pct: number): string {
  if (pct >= 100) return '🔴';
  if (pct >= 80) return '🟡';
  return '🟢';
}

export function PlatformUsageDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [result] = useQuery<{ platformUsageOverview: TenantRow[] }>({
    query: PLATFORM_USAGE_QUERY,
    pause: !mounted,
  });

  if (role && role !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" data-testid="access-denied">
        <p className="text-destructive font-semibold">Access Denied — SUPER_ADMIN only</p>
      </div>
    );
  }

  const { data, fetching, error } = result;

  const rows = [...(data?.platformUsageOverview ?? [])].sort(
    (a, b) => b.seatUtilizationPct - a.seatUtilizationPct
  );

  const handleExportCsv = useCallback(() => {
    const header = 'Tenant,Plan,YAU,Seat Limit,Utilization %,Status\n';
    const body = rows
      .map(
        (r) =>
          `"${r.tenantName}",${r.plan},${r.yearlyActiveUsers},${r.seatLimit},${r.seatUtilizationPct},${statusEmoji(r.seatUtilizationPct)}`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'platform-usage.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  return (
    <AdminLayout
      title="Platform Usage"
      description="YAU utilization across all tenants"
    >
      <div data-testid="platform-usage-page">
        {/* Export button */}
        <div className="flex justify-end mb-4">
          <Button
            data-testid="export-csv-btn"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        </div>

        {fetching && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        )}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              Failed to load platform data: {error.message}
            </CardContent>
          </Card>
        )}

        {!fetching && !error && (
          <Table data-testid="platform-usage-table">
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">YAU</TableHead>
                <TableHead className="text-right">Seat Limit</TableHead>
                <TableHead className="text-right">Utilization %</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.tenantId}>
                  <TableCell className="font-medium">{row.tenantName}</TableCell>
                  <TableCell>{row.plan}</TableCell>
                  <TableCell className="text-right">{row.yearlyActiveUsers}</TableCell>
                  <TableCell className="text-right">{row.seatLimit}</TableCell>
                  <TableCell className="text-right">{row.seatUtilizationPct}%</TableCell>
                  <TableCell className="text-center" aria-label={`Status: ${statusEmoji(row.seatUtilizationPct)}`}>
                    {statusEmoji(row.seatUtilizationPct)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No tenant data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
}
