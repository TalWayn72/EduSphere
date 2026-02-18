import { useQuery } from 'urql';
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
import {
  MOCK_HEATMAP_DATA,
  MOCK_COURSE_PROGRESS,
  MOCK_WEEKLY_STATS,
  MOCK_ACTIVITY_FEED,
  MOCK_LEARNING_STREAK,
  MOCK_TOTAL_STUDY_MINUTES,
  MOCK_CONCEPTS_MASTERED,
} from '@/lib/mock-analytics';
import { MOCK_ME, MOCK_COURSES } from '@/lib/mock-dashboard.data';
import {
  BookOpen,
  Users,
  FileText,
  Bot,
  Flame,
  Clock,
  Brain,
} from 'lucide-react';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

export function Dashboard() {
  const [meResult] = useQuery({ query: ME_QUERY, pause: DEV_MODE });
  const [coursesResult] = useQuery({
    query: COURSES_QUERY,
    variables: { first: 5 },
    pause: DEV_MODE,
  });

  const meData = DEV_MODE || meResult.error ? MOCK_ME : meResult.data;
  const coursesData =
    DEV_MODE || coursesResult.error ? MOCK_COURSES : coursesResult.data;
  const meFetching = !DEV_MODE && meResult.fetching;
  const coursesFetching = !DEV_MODE && coursesResult.fetching;
  const meError = !DEV_MODE && meResult.error;

  const totalMinutesDisplay =
    MOCK_TOTAL_STUDY_MINUTES >= 60
      ? `${Math.floor(MOCK_TOTAL_STUDY_MINUTES / 60)}h ${MOCK_TOTAL_STUDY_MINUTES % 60}m`
      : `${MOCK_TOTAL_STUDY_MINUTES}m`;

  return (
    <Layout>
      <AIChatPanel />
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{meData?.me && `, ${meData.me.firstName}`}!
          </p>
        </div>

        {DEV_MODE && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                🔧 <strong>Development Mode:</strong> Using mock data. Start the
                Gateway to see real data.
              </p>
            </CardContent>
          </Card>
        )}

        {meError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Error loading user data: {meError.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Primary Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coursesFetching ? '...' : (coursesData?.courses?.edges?.length ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">Enrolled and in progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{MOCK_LEARNING_STREAK} days</div>
              <p className="text-xs text-muted-foreground">Keep it up! 🔥</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMinutesDisplay}</div>
              <p className="text-xs text-muted-foreground">Total this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concepts Mastered</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{MOCK_CONCEPTS_MASTERED}</div>
              <p className="text-xs text-muted-foreground">In knowledge graph</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Active collaborations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">Notes and highlights</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Sessions</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">Learning agent interactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Course Progress + Weekly Stats */}
        <LearningStats courses={MOCK_COURSE_PROGRESS} weeklyStats={MOCK_WEEKLY_STATS} />

        {/* Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Study Activity</CardTitle>
            <CardDescription>Your learning activity over the past 12 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={MOCK_HEATMAP_DATA} />
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

          {meFetching ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Loading profile...</p>
              </CardContent>
            </Card>
          ) : meData?.me ? (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Username</dt>
                    <dd className="text-sm mt-1">{meData.me.username}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</dt>
                    <dd className="text-sm mt-1">{meData.me.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</dt>
                    <dd className="text-sm mt-1">{meData.me.role}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tenant</dt>
                    <dd className="text-xs mt-1 font-mono text-muted-foreground truncate">{meData.me.tenantId}</dd>
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
