import { useQuery } from 'urql';
import { useDeferredValue } from 'react';
import { Layout } from '@/components/Layout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { AIChatPanel } from '@/components/AIChatPanel';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { LearningStats } from '@/components/LearningStats';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ME_QUERY, COURSES_QUERY, MY_STATS_QUERY } from '@/lib/queries';
import {
  MOCK_COURSE_PROGRESS,
  MOCK_WEEKLY_STATS,
  MOCK_ACTIVITY_FEED,
} from '@/lib/mock-analytics';
import {
  BookOpen,
  Users,
  FileText,
  Bot,
  Clock,
  Brain,
} from 'lucide-react';

interface MeQueryResult {
  me: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

interface CourseNode {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  estimatedHours: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CoursesQueryResult {
  courses: CourseNode[];
}

interface MyStatsResult {
  myStats: {
    coursesEnrolled: number;
    annotationsCreated: number;
    conceptsMastered: number;
    totalLearningMinutes: number;
    weeklyActivity: { date: string; count: number }[];
  };
}

function StatSkeleton() {
  return (
    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
  );
}

export function Dashboard() {
  const [meResult] = useQuery<MeQueryResult>({ query: ME_QUERY });
  const [coursesResult] = useQuery<CoursesQueryResult>({
    query: COURSES_QUERY,
    variables: { limit: 5, offset: 0 },
  });
  const [statsResult] = useQuery<MyStatsResult>({ query: MY_STATS_QUERY });

  const stats = statsResult.data?.myStats;

  // useDeferredValue defers rendering of the data-intensive ActivityHeatmap.
  // React will render the heatmap with the previous (stale) data first while
  // computing the updated layout, keeping the rest of the page responsive.
  const weeklyActivity = stats?.weeklyActivity ?? [];
  const deferredActivity = useDeferredValue(weeklyActivity);

  const totalMinutesDisplay = (() => {
    const m = stats?.totalLearningMinutes ?? 0;
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  })();

  return (
    <Layout>
      <AIChatPanel />
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{meResult.data?.me && `, ${meResult.data.me.firstName}`}!
          </p>
        </div>

        {meResult.error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Error loading user data: {meResult.error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {statsResult.error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Error loading stats: {statsResult.error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Primary Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsResult.fetching ? (
                  <StatSkeleton />
                ) : (
                  stats?.coursesEnrolled ?? 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Active enrollments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsResult.fetching ? <StatSkeleton /> : totalMinutesDisplay}
              </div>
              <p className="text-xs text-muted-foreground">Total recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concepts Mastered</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsResult.fetching ? (
                  <StatSkeleton />
                ) : (
                  stats?.conceptsMastered ?? 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Completed content items</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coursesResult.fetching
                  ? '...'
                  : (coursesResult.data?.courses?.length ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">Available in catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsResult.fetching ? (
                  <StatSkeleton />
                ) : (
                  stats?.annotationsCreated ?? 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Notes and highlights</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Bot className="h-4 w-4 inline mr-1 text-muted-foreground" />
                —
              </div>
              <p className="text-xs text-muted-foreground">Active collaborations</p>
            </CardContent>
          </Card>
        </div>

        {/* Course Progress + Weekly Stats */}
        <LearningStats courses={MOCK_COURSE_PROGRESS} weeklyStats={MOCK_WEEKLY_STATS} />

        {/* Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Study Activity</CardTitle>
            <CardDescription>
              Your annotation activity over the past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsResult.fetching ? (
              <div className="h-16 bg-muted animate-pulse rounded" />
            ) : (
              <ActivityHeatmap data={deferredActivity} />
            )}
          </CardContent>
        </Card>

        {/* Activity Feed + Profile */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest learning events</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={MOCK_ACTIVITY_FEED} />
            </CardContent>
          </Card>

          {meResult.fetching ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Loading profile...</p>
              </CardContent>
            </Card>
          ) : meResult.data?.me ? (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</dt>
                    <dd className="text-sm mt-1">{meResult.data.me.firstName} {meResult.data.me.lastName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</dt>
                    <dd className="text-sm mt-1">{meResult.data.me.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</dt>
                    <dd className="text-sm mt-1">{meResult.data.me.role}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tenant</dt>
                    <dd className="text-xs mt-1 font-mono text-muted-foreground truncate">{meResult.data.me.tenantId}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
