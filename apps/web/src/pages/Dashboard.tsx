import { useQuery } from 'urql';
import { useState, useEffect, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { SRSWidget } from '@/components/SRSWidget';
import { LeaderboardWidget } from '@/components/LeaderboardWidget';
import { SkillGapWidget } from '@/components/SkillGapWidget';
import { DailyLearningWidget } from '@/components/DailyLearningWidget';
import { ME_QUERY, COURSES_QUERY, MY_STATS_QUERY } from '@/lib/queries';
import { MY_ANNOTATIONS_QUERY } from '@/lib/graphql/annotation.queries';
import {
  MOCK_COURSE_PROGRESS,
  MOCK_WEEKLY_STATS,
  MOCK_ACTIVITY_FEED,
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
    preferences: {
      locale: string;
      theme: string;
      emailNotifications: boolean;
      pushNotifications: boolean;
    } | null;
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

interface MyStatsQueryResult {
  myStats: {
    coursesEnrolled: number;
    annotationsCreated: number;
    conceptsMastered: number;
    totalLearningMinutes: number;
    weeklyActivity: { date: string; count: number }[];
  };
}

export function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const localUser = getCurrentUser();

  // Mounted guard: prevent urql cache dispatch during sibling route render
  // (/dashboard and /dashboard/legacy share the same parent path prefix).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [meResult] = useQuery<MeQueryResult>({ query: ME_QUERY, pause: !mounted });
  const [coursesResult] = useQuery<CoursesQueryResult>({
    query: COURSES_QUERY,
    variables: { limit: 100, offset: 0 },
    pause: !mounted,
  });

  // MY_ANNOTATIONS_QUERY requires userId; pause until me resolves to avoid a
  // premature request with an undefined variable.
  const currentUserId = meResult.data?.me?.id;
  const [annotationsResult] = useQuery<MyAnnotationsQueryResult>({
    query: MY_ANNOTATIONS_QUERY,
    variables: { userId: currentUserId, limit: 500, offset: 0 },
    pause: !mounted || !currentUserId,
  });

  // Backend myStats resolver — provides real stats with MOCK_STATS as fallback.
  const [statsResult] = useQuery<MyStatsQueryResult>({
    query: MY_STATS_QUERY,
    pause: !mounted,
  });
  const myStats = statsResult.data?.myStats;

  if (statsResult.error) {
    console.error('[Dashboard] myStats query error:', statsResult.error.message);
  }

  // --- Derived stats: prefer myStats backend data, then per-query fallback, then MOCK ---

  const coursesEnrolled = statsResult.fetching && coursesResult.fetching
    ? null
    : (myStats?.coursesEnrolled
        ?? coursesResult.data?.courses?.length
        ?? MOCK_STATS.coursesEnrolled);

  const annotationsCreated = statsResult.fetching && annotationsResult.fetching
    ? null
    : (myStats?.annotationsCreated
        ?? annotationsResult.data?.annotationsByUser?.length
        ?? MOCK_STATS.annotationsCreated);

  const totalLearningMinutes = myStats?.totalLearningMinutes ?? MOCK_STATS.totalLearningMinutes;
  const totalMinutesDisplay =
    totalLearningMinutes >= 60
      ? `${Math.floor(totalLearningMinutes / 60)}h ${totalLearningMinutes % 60}m`
      : `${totalLearningMinutes}m`;

  const conceptsMastered = myStats?.conceptsMastered ?? MOCK_STATS.conceptsMastered;

  // useDeferredValue defers rendering of the data-intensive ActivityHeatmap.
  const weeklyActivity = myStats?.weeklyActivity ?? MOCK_STATS.weeklyActivity;
  const deferredActivity = useDeferredValue(weeklyActivity);

  const firstName = meResult.data?.me?.firstName ?? localUser?.firstName;

  return (
    <Layout>
      <AIChatPanel />
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {firstName
              ? t('welcomeBack', { name: firstName })
              : t('welcomeBack', { name: '' }).trimEnd()}
          </p>
        </div>

        {/* Instructor / Admin quick actions */}
        {localUser &&
          ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(
            localUser.role
          ) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  {t('instructorTools')}
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
                  {t('createCourse')}
                </Link>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  {t('manageCourses')}
                </Link>
              </CardContent>
            </Card>
          )}

        {meResult.error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                {t('errorLoadingUser')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Primary Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('stats.coursesEnrolled')}
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Real: derived from COURSES_QUERY catalog count */}
              <div className="text-2xl font-bold">
                {coursesEnrolled === null ? '...' : coursesEnrolled}
              </div>
              <p className="text-xs text-muted-foreground">
                Available in catalog
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                {t('stats.studyTime')}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">BETA</span>
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMinutesDisplay}</div>
              <p className="text-xs text-muted-foreground">Estimated — real tracking coming soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                {t('stats.conceptsMastered')}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">BETA</span>
              </CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsResult.fetching ? '...' : conceptsMastered}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated — real tracking coming soon
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('stats.activeCourses')}
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Real: same COURSES_QUERY result as Courses Enrolled card */}
              <div className="text-2xl font-bold">
                {coursesEnrolled === null ? '...' : coursesEnrolled}
              </div>
              <p className="text-xs text-muted-foreground">
                Available in catalog
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('stats.annotationsCreated')}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Real: derived from MY_ANNOTATIONS_QUERY (annotationsByUser count) */}
              <div className="text-2xl font-bold">
                {annotationsCreated === null ? '...' : annotationsCreated}
              </div>
              <p className="text-xs text-muted-foreground">
                Notes and highlights
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Study Groups
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Bot className="h-4 w-4 inline mr-1 text-muted-foreground" />—
              </div>
              <p className="text-xs text-muted-foreground">
                Active collaborations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Learning Widget (F-021 Microlearning) */}
        <DailyLearningWidget />

        {/* SRS Review Queue Widget (F-001) */}
        <SRSWidget />

        {/* Leaderboard Widget (F-011) */}
        <LeaderboardWidget />

        {/* Skill Gap Analysis Widget (F-006) */}
        <SkillGapWidget />

        {/* Course Progress + Weekly Stats (mock data — real analytics coming soon) */}
        <div className="relative">
          <span className="absolute -top-2 right-3 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">BETA DATA</span>
          <LearningStats
            courses={MOCK_COURSE_PROGRESS}
            weeklyStats={MOCK_WEEKLY_STATS}
          />
        </div>

        {/* Activity Heatmap (mock data) */}
        <Card className="relative">
          <span className="absolute -top-2 right-3 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">BETA DATA</span>
          <CardHeader>
            <CardTitle>{t('studyActivity')}</CardTitle>
            <CardDescription>{t('activityDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={deferredActivity} />
          </CardContent>
        </Card>

        {/* Activity Feed + Profile */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="relative">
            <span className="absolute -top-2 right-3 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">BETA DATA</span>
            <CardHeader>
              <CardTitle>{t('recentActivity')}</CardTitle>
              <CardDescription>{t('latestEvents')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={MOCK_ACTIVITY_FEED} />
            </CardContent>
          </Card>

          {(() => {
            // Use real GraphQL data when available, fall back to JWT-parsed user
            const profile =
              meResult.data?.me ??
              (localUser
                ? {
                    firstName: localUser.firstName,
                    lastName: localUser.lastName,
                    email: localUser.email,
                    role: localUser.role,
                    tenantId: localUser.tenantId,
                  }
                : null);

            if (meResult.fetching && !localUser) {
              return (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      {t('common:loading')}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            if (!profile) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle>{t('common:profile')}</CardTitle>
                  <CardDescription>
                    {t('common:accountInformation')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Name
                      </dt>
                      <dd className="text-sm mt-1">
                        {profile.firstName} {profile.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Email
                      </dt>
                      <dd className="text-sm mt-1">{profile.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Role
                      </dt>
                      <dd className="text-sm mt-1">{profile.role}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Tenant
                      </dt>
                      <dd className="text-xs mt-1 font-mono text-muted-foreground truncate">
                        {profile.tenantId || '—'}
                      </dd>
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
