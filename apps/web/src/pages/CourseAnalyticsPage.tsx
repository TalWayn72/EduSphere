/**
 * CourseAnalyticsPage — Instructor dashboard showing enrollment, completion,
 * engagement, and drop-off metrics for a specific course.
 * Route: /courses/:courseId/analytics
 * Access: INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN only
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  COURSE_ANALYTICS_QUERY,
  AT_RISK_LEARNERS_QUERY,
  RESOLVE_AT_RISK_FLAG_MUTATION,
} from '@/lib/graphql/content-tier3.queries';
import {
  ArrowLeft,
  Users,
  Activity,
  TrendingUp,
  Star,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { AnalyticsCharts } from './CourseAnalyticsPage.charts';
import { useAuthRole } from '@/hooks/useAuthRole';
import { AtRiskLearnersTable } from '@/components/AtRiskLearnersTable';
import type { AtRiskLearnerRow } from '@/components/AtRiskLearnersTable';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentItemMetric {
  contentItemId: string;
  title: string;
  viewCount: number;
  avgTimeSpentSeconds: number;
  completionRate: number;
}

export interface FunnelStep {
  moduleId: string;
  moduleName: string;
  learnersStarted: number;
  learnersCompleted: number;
  dropOffRate: number;
}

interface CourseAnalyticsData {
  courseId: string;
  enrollmentCount: number;
  activeLearnersLast7Days: number;
  completionRate: number;
  avgQuizScore: number | null;
  contentItemMetrics: ContentItemMetric[];
  dropOffFunnel: FunnelStep[];
}

interface CourseAnalyticsResult {
  courseAnalytics: CourseAnalyticsData;
}

interface AtRiskResult {
  atRiskLearners: AtRiskLearnerRow[];
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-3">
        <span className="text-primary">{icon}</span>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

export function CourseAnalyticsPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();
  const [resolving, setResolving] = useState<string | null>(null);

  const paused = !courseId || !ALLOWED_ROLES.has(role ?? '');

  const [{ data, fetching, error }] = useQuery<CourseAnalyticsResult>({
    query: COURSE_ANALYTICS_QUERY,
    variables: { courseId },
    pause: true, // courseAnalytics not in live gateway (tier-3)
  });

  const [{ data: riskData }] = useQuery<AtRiskResult>({
    query: AT_RISK_LEARNERS_QUERY,
    variables: { courseId },
    pause: true, // atRiskLearners not in live gateway (tier-3)
  });

  const [, resolveFlag] = useMutation(RESOLVE_AT_RISK_FLAG_MUTATION);

  const handleResolve = async (learnerId: string, _courseId: string) => {
    const key = learnerId + _courseId;
    setResolving(key);
    await resolveFlag({ flagId: learnerId });
    setResolving(null);
  };

  if (!ALLOWED_ROLES.has(role ?? '')) {
    return (
      <Layout>
        <div className="flex items-center gap-2 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Access denied. Instructor or Admin role required.</span>
        </div>
      </Layout>
    );
  }

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-muted-foreground p-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </Layout>
    );
  }

  if (error || !data?.courseAnalytics) {
    return (
      <Layout>
        <div className="flex items-center gap-2 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load analytics. {error?.message}</span>
        </div>
      </Layout>
    );
  }

  const a = data.courseAnalytics;
  const atRisk = riskData?.atRiskLearners ?? [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>
          <h1 className="text-xl font-semibold">Course Analytics</h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Enrolled"
            value={a.enrollmentCount}
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Active (7d)"
            value={a.activeLearnersLast7Days}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Completion Rate"
            value={`${a.completionRate}%`}
          />
          <StatCard
            icon={<Star className="h-4 w-4" />}
            label="Avg Quiz Score"
            value={a.avgQuizScore != null ? `${a.avgQuizScore}%` : 'N/A'}
            sub="Quiz scores not yet tracked"
          />
        </div>

        <AnalyticsCharts
          contentItemMetrics={a.contentItemMetrics}
          dropOffFunnel={a.dropOffFunnel}
        />

        {/* At-Risk Learners */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">
              At-Risk Learners
              {atRisk.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
                  {atRisk.length} at risk
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AtRiskLearnersTable
              learners={atRisk}
              onResolve={handleResolve}
              resolving={resolving}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
