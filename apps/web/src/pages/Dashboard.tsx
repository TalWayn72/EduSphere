import { useQuery } from 'urql';
import { useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
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
import { ME_QUERY, COURSES_QUERY } from '@/lib/queries';
import { MY_ANNOTATIONS_QUERY } from '@/lib/graphql/annotation.queries';
import {
  MOCK_COURSE_PROGRESS,
  MOCK_WEEKLY_STATS,
  MOCK_ACTIVITY_FEED,
  // myStats resolver is not yet in the deployed supergraph — mock is the fallback.
  // weeklyActivity, totalLearningMinutes, conceptsMastered: no backend query yet (mock).
  // coursesEnrolled: resolved from COURSES_QUERY.data.courses.length (real).
  // annotationsCreated: resolved from MY_ANNOTATIONS_QUERY count (real).
  MOCK_STATS,
} from '@/lib/mock-analytics';
import {
  BookOpen,
  Users,
  FileText,
  Bot,
  Clock,
  Brain,
  PlusCircle,
  Settings,
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
}

interface CoursesQueryResult {
  courses: CourseNode[];
}

interface AnnotationNode {
  id: string;
}

interface MyAnnotationsQueryResult {
  annotationsByUser: AnnotationNode[];
}

export function Dashboard() {
  const localUser = getCurrentUser();
  const [meResult] = useQuery<MeQueryResult>({ query: ME_QUERY });
  const [coursesResult] = useQuery<CoursesQueryResult>({
    query: COURSES_QUERY,
    variables: { limit: 100, offset: 0 },
  });

  // MY_ANNOTATIONS_QUERY requires userId; pause until me resolves to avoid a
  // premature request with an undefined variable.
  const currentUserId = meResult.data?.me?.id;
  const [annotationsResult] = useQuery<MyAnnotationsQueryResult>({
    query: MY_ANNOTATIONS_QUERY,
    variables: { userId: currentUserId, limit: 500, offset: 0 },
    pause: !currentUserId,
  });

  // --- Derived real stats (fall back to MOCK_STATS when real data unavailable) ---

  // REAL: total courses from the catalog (limit raised to 100 so the count is meaningful)
  const coursesEnrolled =
    coursesResult.fetching
      ? null
      : (coursesResult.data?.courses?.length ?? MOCK_STATS.coursesEnrolled);

  // REAL: annotation count from annotationsByUser
  const annotationsCreated =
    !currentUserId || annotationsResult.fetching
      ? null
      : (annotationsResult.data?.annotationsByUser?.length ?? MOCK_STATS.annotationsCreated);

  // MOCK: no backend query yet for study time or concepts mastered
  const totalLearningMinutes = MOCK_STATS.totalLearningMinutes;
  const totalMinutesDisplay =
    totalLearningMinutes >= 60
      ? `${Math.floor(totalLearningMinutes / 60)}h ${totalLearningMinutes % 60}m`
      : `${totalLearningMinutes}m`;

  // useDeferredValue defers rendering of the data-intensive ActivityHeatmap.
  // React will render the heatmap with the previous (stale) data first while
  // computing the updated layout, keeping the rest of the page responsive.
  // weeklyActivity has no backend endpoint yet — still mock.
  const deferredActivity = useDeferredValue(MOCK_STATS.weeklyActivity);

  return (
    <Layout>
      <AIChatPanel />
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{(meResult.data?.me?.firstName ?? localUser?.firstName) && `, ${meResult.data?.me?.firstName ?? localUser?.firstName}`}!
          </p>
        </div>

        {/* Instructor / Admin quick actions */}
        {localUser && ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(localUser.role) && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Instructor Tools
                <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {localUser.role.replace('_', ' ')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Link
                to="/courses/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                Create Course
              </Link>
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Manage Courses
              </Link>
            </CardContent>
          </Card>
        )}

        {meResult.error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Error loading user data: {meResult.error.message}
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
              {/* Real: derived from COURSES_QUERY catalog count */}
              <div className="text-2xl font-bold">
                {coursesEnrolled === null ? '...' : coursesEnrolled}
              </div>
              <p className="text-xs text-muted-foreground">Available in catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMinutesDisplay}</div>
              <p className="text-xs text-muted-foreground">Total recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concepts Mastered</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{MOCK_STATS.conceptsMastered}</div>
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
              {/* Real: same COURSES_QUERY result as Courses Enrolled card */}
              <div className="text-2xl font-bold">
                {coursesEnrolled === null ? '...' : coursesEnrolled}
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
              {/* Real: derived from MY_ANNOTATIONS_QUERY (annotationsByUser count) */}
              <div className="text-2xl font-bold">
                {annotationsCreated === null ? '...' : annotationsCreated}
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
            <ActivityHeatmap data={deferredActivity} />
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

          {(() => {
            // Use real GraphQL data when available, fall back to JWT-parsed user
            const profile = meResult.data?.me ?? (localUser ? {
              firstName: localUser.firstName,
              lastName: localUser.lastName,
              email: localUser.email,
              role: localUser.role,
              tenantId: localUser.tenantId,
            } : null);

            if (meResult.fetching && !localUser) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Loading profile...</p>
                  </CardContent>
                </Card>
              );
            }
            if (!profile) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</dt>
                      <dd className="text-sm mt-1">{profile.firstName} {profile.lastName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</dt>
                      <dd className="text-sm mt-1">{profile.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</dt>
                      <dd className="text-sm mt-1">{profile.role}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tenant</dt>
                      <dd className="text-xs mt-1 font-mono text-muted-foreground truncate">{profile.tenantId || '—'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>
    </Layout>
  );
}
