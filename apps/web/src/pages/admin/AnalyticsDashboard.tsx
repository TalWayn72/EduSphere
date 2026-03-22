/**
 * AnalyticsDashboard — KPI cards + Recharts charts for org analytics.
 * Route: /admin/org-analytics
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ANALYTICS_QUERY = `
  query OrgAnalytics($period: String!) {
    orgAnalytics(period: $period) {
      kpis { label value change }
      engagementTrend { date value }
      completionRates { course rate }
      topCourses { title enrollments completions }
    }
  }
`;

interface KPI {
  label: string;
  value: string;
  change: number;
}

interface TrendPoint {
  date: string;
  value: number;
}

interface AnalyticsData {
  kpis: KPI[];
  engagementTrend: TrendPoint[];
  completionRates: Array<{ course: string; rate: number }>;
  topCourses: Array<{ title: string; enrollments: number; completions: number }>;
}

function KpiCard({ kpi }: { kpi: KPI }) {
  const isPositive = kpi.change >= 0;
  return (
    <Card>
      <h1 className="sr-only">Analytics Dashboard</h1>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{kpi.label}</p>
        <p className="text-2xl font-bold mt-1">{kpi.value}</p>
        <p className={`text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{kpi.change}%
        </p>
      </CardContent>
    </Card>
  );
}

function SimpleTrendChart({ data, t }: { data: TrendPoint[]; t: (k: string) => string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{t('analytics.engagementTrend')}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32" role="img" aria-label={t('analytics.trendChartLabel')}>
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors"
              style={{ height: `${(d.value / max) * 100}%` }}
              title={`${d.date}: ${d.value}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const { t } = useTranslation('orgAnalytics');
  const [period, setPeriod] = useState('30d');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [{ data, fetching }] = useQuery<{ orgAnalytics: AnalyticsData }>({
    query: ANALYTICS_QUERY,
    variables: { period },
    pause: !mounted,
  });

  const analytics = data?.orgAnalytics;

  return (
    <AdminLayout title={t('analytics.title')} description={t('analytics.description')}>
      <div data-testid="analytics-dashboard-page" className="space-y-6">
        <div className="flex justify-end">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32" aria-label={t('analytics.periodLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('analytics.periods.7d')}</SelectItem>
              <SelectItem value="30d">{t('analytics.periods.30d')}</SelectItem>
              <SelectItem value="90d">{t('analytics.periods.90d')}</SelectItem>
              <SelectItem value="1y">{t('analytics.periods.1y')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {fetching ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {analytics.kpis.map((kpi, i) => (
                <KpiCard key={i} kpi={kpi} />
              ))}
            </div>

            <SimpleTrendChart data={analytics.engagementTrend} t={t} />

            <Card>
              <CardHeader><CardTitle className="text-base">{t('analytics.topCourses')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topCourses.map((course, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{course.title}</span>
                      <span className="text-muted-foreground">
                        {course.completions}/{course.enrollments} {t('analytics.completed')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t('analytics.noData')}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
