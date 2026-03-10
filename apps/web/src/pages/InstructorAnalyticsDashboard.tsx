/**
 * InstructorAnalyticsDashboard — Hub page for instructor-level analytics.
 * Route: /instructor/analytics
 * Access: INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN only
 *
 * Shows aggregate stats across all courses + tabbed sub-panels:
 * Overview · Learner Engagement · At-Risk Learners · AI Usage
 */
import React, { useState } from 'react';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Users, TrendingUp, Star, Activity } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY } from '@/lib/graphql/analytics.queries';
import { DropOffFunnelChart } from '@/components/analytics/DropOffFunnelChart';
import { AtRiskLearnersPanel } from '@/components/analytics/AtRiskLearnersPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FunnelStep {
  moduleId: string;
  moduleName: string;
  learnersStarted: number;
  learnersCompleted: number;
  dropOffRate: number;
}

interface CourseAnalyticsSummary {
  courseId: string;
  enrollmentCount: number;
  completionRate: number;
  avgQuizScore: number | null;
  activeLearnersLast7Days: number;
  dropOffFunnel: FunnelStep[];
}

interface CourseWithAnalytics {
  id: string;
  title: string;
  courseAnalytics: CourseAnalyticsSummary | null;
}

interface OverviewResult {
  myCourses: CourseWithAnalytics[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);
const TABS = ['Overview', 'Learner Engagement', 'At-Risk Learners', 'AI Usage'] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
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
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InstructorAnalyticsDashboard() {
  const role = useAuthRole();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const [{ data, fetching }] = useQuery<OverviewResult>({
    query: INSTRUCTOR_ANALYTICS_OVERVIEW_QUERY,
    pause: true, // TODO(Phase-49): resolver not yet in supergraph — wire when available
  });

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

  const courses = data?.myCourses ?? [];
  const analyticsRows = courses
    .map((c) => c.courseAnalytics)
    .filter((a): a is CourseAnalyticsSummary => a != null);

  const totalEnrollments = analyticsRows.reduce((s, a) => s + a.enrollmentCount, 0);
  const avgCompletion = avg(analyticsRows.map((a) => a.completionRate));
  const avgQuiz = avg(
    analyticsRows.flatMap((a) => (a.avgQuizScore != null ? [a.avgQuizScore] : []))
  );
  const atRiskCount = analyticsRows.filter((a) => a.completionRate < 20).length;

  // Flatten all funnel steps across courses for the engagement tab
  const allFunnelSteps = analyticsRows.flatMap((a) => a.dropOffFunnel);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold">Instructor Analytics</h1>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Total Enrollments"
            value={fetching ? '—' : totalEnrollments}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg Completion Rate"
            value={fetching ? '—' : `${avgCompletion}%`}
          />
          <StatCard
            icon={<Star className="h-4 w-4" />}
            label="Avg Quiz Score"
            value={fetching ? '—' : `${avgQuiz}%`}
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="At-Risk Courses"
            value={fetching ? '—' : atRiskCount}
          />
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Analytics sections"
          className="flex gap-2 border-b pb-0"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        {activeTab === 'Overview' && (
          <div className="space-y-4">
            {courses.length === 0 && !fetching && (
              <p className="text-muted-foreground text-sm">No courses found.</p>
            )}
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="text-base">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {course.courseAnalytics
                    ? `${course.courseAnalytics.enrollmentCount} enrolled ·
                       ${course.courseAnalytics.completionRate}% completion`
                    : 'Analytics not available'}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'Learner Engagement' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Module Drop-off Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <DropOffFunnelChart data={allFunnelSteps} />
            </CardContent>
          </Card>
        )}

        {activeTab === 'At-Risk Learners' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">At-Risk Learners</CardTitle>
            </CardHeader>
            <CardContent>
              {courses[0] ? (
                <AtRiskLearnersPanel courseId={courses[0].id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No at-risk learners — great job!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'AI Usage' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Agent Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI usage analytics coming soon.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
