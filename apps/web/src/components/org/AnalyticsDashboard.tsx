/**
 * AnalyticsDashboard — Organization analytics dashboard with KPI cards,
 * time series chart area, date range selector, and CSV export.
 */
import { useTranslation } from 'react-i18next';
import { useOrgAnalytics } from '@/hooks/useOrgAnalytics';

interface KpiCardProps {
  label: string;
  value: string;
}

function KpiCard({ label, value }: KpiCardProps) {
  return (
    <article role="article" aria-label={label}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </article>
  );
}

function KpiSkeleton() {
  return (
    <div data-testid="kpi-skeleton" className="animate-pulse h-16 bg-muted rounded" />
  );
}

export function AnalyticsDashboard() {
  const { t } = useTranslation();
  const { kpis, isLoading, exportCsv } = useOrgAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
    );
  }

  const isEmptyOrg = kpis && kpis.totalUsers === 0 && kpis.totalCourses === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label htmlFor="date-range-select" className="sr-only">
          Date Range
        </label>
        <select id="date-range-select" aria-label="Date Range" className="border rounded px-2 py-1">
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
        <button
          onClick={exportCsv}
          className="px-3 py-1 border rounded text-sm"
          aria-label="Export CSV"
        >
          Export
        </button>
      </div>

      {isEmptyOrg ? (
        <p>{t('orgOnboarding.noDataYet')}</p>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Users" value={String(kpis.totalUsers)} />
          <KpiCard label="Active Users" value={String(kpis.activeUsers)} />
          <KpiCard label="Total Courses" value={String(kpis.totalCourses)} />
          <KpiCard label="Storage" value={`${kpis.storageGb} GB`} />
          <KpiCard label="Completion Rate" value={`${kpis.completionRate}%`} />
        </div>
      ) : null}
    </div>
  );
}
