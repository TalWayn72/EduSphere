/**
 * AtRiskDashboardPage - Admin at-risk learner monitoring dashboard.
 * Route: /admin/at-risk
 * Phase 36: replaced mock data with real listAtRiskLearners GraphQL query.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import { gql } from 'urql';
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  BookOpen,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuthRole } from '@/hooks/useAuthRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AtRiskLearnersTable,
  type AtRiskLearnerRow,
} from '@/components/AtRiskLearnersTable';
import { RiskThresholdConfig } from './AtRiskDashboardPage.config';
import { LIST_AT_RISK_LEARNERS_QUERY } from '@/lib/graphql/at-risk.queries';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

const RESOLVE_AT_RISK = gql`
  mutation ResolveAtRiskFlag($flagId: ID!) {
    resolveAtRiskFlag(flagId: $flagId)
  }
`;

type RiskFilter = 'all' | 'high' | 'medium' | 'low';
type SortKey = 'risk' | 'inactive' | 'progress';

function applyFilter(
  rows: AtRiskLearnerRow[],
  filter: RiskFilter
): AtRiskLearnerRow[] {
  if (filter === 'high') return rows.filter((r) => r.riskScore > 0.7);
  if (filter === 'medium')
    return rows.filter((r) => r.riskScore >= 0.5 && r.riskScore <= 0.7);
  if (filter === 'low') return rows.filter((r) => r.riskScore < 0.5);
  return rows;
}

function applySort(
  rows: AtRiskLearnerRow[],
  sort: SortKey
): AtRiskLearnerRow[] {
  const copy = [...rows];
  if (sort === 'risk') copy.sort((a, b) => b.riskScore - a.riskScore);
  if (sort === 'inactive')
    copy.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);
  if (sort === 'progress')
    copy.sort((a, b) => a.progressPercent - b.progressPercent);
  return copy;
}

function exportCsv(rows: AtRiskLearnerRow[]) {
  const header =
    'learnerId,courseId,riskScore,daysSinceLastActivity,progressPercent,flaggedAt';
  const body = rows
    .map((r) =>
      [
        r.learnerId,
        r.courseId,
        r.riskScore,
        r.daysSinceLastActivity,
        r.progressPercent,
        r.flaggedAt,
      ].join(',')
    )
    .join(String.fromCharCode(10));
  const blob = new Blob([header + String.fromCharCode(10) + body], {
    type: 'text/csv',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'at-risk-learners.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/** Map real GraphQL AtRiskLearner to the table's AtRiskLearnerRow shape */
function toTableRow(r: {
  userId: string;
  displayName: string;
  courseId: string;
  courseTitle: string;
  daysSinceActive: number;
  progressPct: number;
}): AtRiskLearnerRow {
  const riskScore = Math.max(0, Math.min(1, (100 - r.progressPct) / 100));
  const riskFactors: AtRiskLearnerRow['riskFactors'] = [];
  if (r.daysSinceActive >= 7) {
    riskFactors.push({
      key: 'inactivity',
      description: `No activity for ${r.daysSinceActive} days`,
    });
  }
  if (r.progressPct < 30) {
    riskFactors.push({
      key: 'low_progress',
      description: 'Below 30% completion',
    });
  }
  return {
    learnerId: r.userId,
    courseId: r.courseId,
    riskScore,
    daysSinceLastActivity: r.daysSinceActive,
    progressPercent: r.progressPct,
    flaggedAt: new Date().toISOString(),
    riskFactors,
  };
}

export function AtRiskDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [, resolveFlag] = useMutation(RESOLVE_AT_RISK);
  const [resolving, setResolving] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskFilter>('all');
  const [sort, setSort] = useState<SortKey>('risk');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery({
    query: LIST_AT_RISK_LEARNERS_QUERY,
    variables: { threshold: 30 },
    pause: !mounted,
  });

  const learners: AtRiskLearnerRow[] = useMemo(
    () => (data?.listAtRiskLearners ?? []).map(toTableRow),
    [data]
  );

  const visible = useMemo(
    () => applySort(applyFilter(learners, filter), sort),
    [learners, filter, sort]
  );

  const stats = useMemo(
    () => ({
      total: learners.length,
      high: learners.filter((r) => r.riskScore > 0.7).length,
      avgInactive: learners.length
        ? Math.round(
            learners.reduce((s, r) => s + r.daysSinceLastActivity, 0) /
              learners.length
          )
        : 0,
      courses: new Set(learners.map((r) => r.courseId)).size,
    }),
    [learners]
  );

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  async function handleResolve(learnerId: string, courseId: string) {
    const key = learnerId + courseId;
    setResolving(key);
    await resolveFlag({ flagId: key });
    setResolving(null);
    toast.success('Learner flag resolved');
  }

  const statCards = [
    {
      icon: AlertTriangle,
      label: 'Total At-Risk',
      value: fetching ? '…' : stats.total,
      color: 'text-orange-500',
    },
    {
      icon: TrendingDown,
      label: 'High Risk (>70%)',
      value: fetching ? '…' : stats.high,
      color: 'text-red-500',
    },
    {
      icon: Clock,
      label: 'Avg Days Inactive',
      value: fetching ? '…' : stats.avgInactive + 'd',
      color: 'text-yellow-500',
    },
    {
      icon: BookOpen,
      label: 'Courses Affected',
      value: fetching ? '…' : stats.courses,
      color: 'text-blue-500',
    },
  ] as const;

  return (
    <AdminLayout
      title="At-Risk Learners"
      description="Identify and support learners who may need intervention"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value, color }) => (
            <Card key={label}>
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center gap-2">
                <Icon className={'h-4 w-4 ' + color} />
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Unable to load at-risk learners. Please try again.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as RiskFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="high">High (&gt;70%)</SelectItem>
              <SelectItem value="medium">Medium (50-70%)</SelectItem>
              <SelectItem value="low">Low (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">Risk Score (highest first)</SelectItem>
              <SelectItem value="inactive">
                Days Inactive (most first)
              </SelectItem>
              <SelectItem value="progress">Progress (lowest first)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => exportCsv(visible)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4">
            {!fetching && !error && learners.length === 0 ? (
              <p
                data-testid="empty-state"
                className="text-sm text-muted-foreground py-4 text-center"
              >
                No at-risk learners detected. Great work!
              </p>
            ) : (
              <AtRiskLearnersTable
                learners={visible}
                onResolve={handleResolve}
                resolving={resolving}
              />
            )}
          </CardContent>
        </Card>

        <RiskThresholdConfig />
      </div>
    </AdminLayout>
  );
}
