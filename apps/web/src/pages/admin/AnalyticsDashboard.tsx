/**
 * AnalyticsDashboard — KPI cards + Recharts charts + At-Risk Learners for org analytics.
 * Route: /admin/org-analytics
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LearnerDetailPanel } from './LearnerDetailPanel';

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

const AT_RISK_QUERY = `
  query OrgAtRiskLearners($limit: Int, $offset: Int) {
    orgAtRiskLearners(limit: $limit, offset: $offset) {
      userId
      email
      name
      lastActive
      quizPassRate
      completionRate
      riskLevel
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
  topCourses: Array<{
    title: string;
    enrollments: number;
    completions: number;
  }>;
}

interface AtRiskLearner {
  userId: string;
  email: string;
  name: string;
  lastActive: string | null;
  quizPassRate: number;
  completionRate: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

function KpiCard({ kpi }: { kpi: KPI }) {
  const isPositive = kpi.change >= 0;
  return (
    <Card>
      <h1 className="sr-only">Analytics Dashboard</h1>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{kpi.label}</p>
        <p className="text-2xl font-bold mt-1">{kpi.value}</p>
        <p
          className={`text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
          {isPositive ? '+' : ''}
          {kpi.change}%
        </p>
      </CardContent>
    </Card>
  );
}

function SimpleTrendChart({
  data,
  t,
}: {
  data: TrendPoint[];
  t: (k: string) => string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('analytics.engagementTrend')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex items-end gap-1 h-32"
          role="img"
          aria-label={t('analytics.trendChartLabel')}
        >
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

function RiskBadge({ level }: { level: AtRiskLearner['riskLevel'] }) {
  const variantMap: Record<string, 'destructive' | 'default' | 'secondary'> = {
    HIGH: 'destructive',
    MEDIUM: 'default',
    LOW: 'secondary',
  };
  return (
    <Badge
      variant={variantMap[level]}
      data-testid={`risk-badge-${level.toLowerCase()}`}
    >
      {level}
    </Badge>
  );
}

export function AnalyticsDashboard() {
  const { t } = useTranslation('orgAnalytics');
  const [period, setPeriod] = useState('30d');
  const [mounted, setMounted] = useState(false);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<{ orgAnalytics: AnalyticsData }>({
    query: ANALYTICS_QUERY,
    variables: { period },
    pause: !mounted,
  });

  const [{ data: atRiskData, fetching: atRiskFetching }] = useQuery<{
    orgAtRiskLearners: AtRiskLearner[];
  }>({
    query: AT_RISK_QUERY,
    variables: { limit: 20, offset: 0 },
    pause: !mounted,
  });

  const analytics = data?.orgAnalytics;
  const atRiskLearners = atRiskData?.orgAtRiskLearners ?? [];

  const handleRowClick = useCallback((userId: string) => {
    setSelectedLearnerId(userId);
    setDetailOpen(true);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setSelectedLearnerId(null);
  }, []);

  return (
    <AdminLayout
      title={t('analytics.title')}
      description={t('analytics.description')}
    >
      <div data-testid="analytics-dashboard-page" className="space-y-6">
        <div className="flex justify-end">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger
              className="w-32"
              aria-label={t('analytics.periodLabel')}
            >
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
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
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
              <CardHeader>
                <CardTitle className="text-base">
                  {t('analytics.topCourses')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topCourses.map((course, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{course.title}</span>
                      <span className="text-muted-foreground">
                        {course.completions}/{course.enrollments}{' '}
                        {t('analytics.completed')}
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

        {/* At-Risk Learners Section */}
        <Card data-testid="at-risk-section">
          <CardHeader>
            <CardTitle className="text-base">
              {t('analytics.atRiskLearners', 'At-Risk Learners')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskFetching ? (
              <Skeleton className="h-32 w-full" />
            ) : atRiskLearners.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('analytics.noAtRisk', 'No at-risk learners detected')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('analytics.name', 'Name')}</TableHead>
                    <TableHead>
                      {t('analytics.lastActive', 'Last Active')}
                    </TableHead>
                    <TableHead>
                      {t('analytics.quizRate', 'Quiz Rate')}
                    </TableHead>
                    <TableHead>
                      {t('analytics.completion', 'Completion')}
                    </TableHead>
                    <TableHead>
                      {t('analytics.riskLevel', 'Risk Level')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskLearners.map((learner) => (
                    <TableRow
                      key={learner.userId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(learner.userId)}
                      data-testid={`at-risk-row-${learner.userId}`}
                    >
                      <TableCell className="font-medium">
                        {learner.name}
                      </TableCell>
                      <TableCell>
                        {learner.lastActive
                          ? new Date(learner.lastActive).toLocaleDateString()
                          : t('analytics.never', 'Never')}
                      </TableCell>
                      <TableCell>{learner.quizPassRate.toFixed(1)}%</TableCell>
                      <TableCell>
                        {learner.completionRate.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={learner.riskLevel} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <LearnerDetailPanel
        userId={selectedLearnerId}
        open={detailOpen}
        onClose={handleDetailClose}
      />
    </AdminLayout>
  );
}
