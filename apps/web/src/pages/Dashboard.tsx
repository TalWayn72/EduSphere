import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import {
  MOCK_COURSE_PROGRESS,
  MOCK_WEEKLY_STATS,
  MOCK_ACTIVITY_FEED,
} from '@/lib/mock-analytics';
import { BookOpen, PlusCircle, Settings } from 'lucide-react';
import { useDashboardQueries } from './useDashboardQueries';
import { PrimaryStatCards, SecondaryStatCards } from './DashboardStatCards';
import { DashboardProfileCard } from './DashboardProfileCard';

export function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const {
    localUser,
    meResult,
    statsResult,
    coursesEnrolled,
    annotationsCreated,
    totalMinutesDisplay,
    conceptsMastered,
    deferredActivity,
    firstName,
  } = useDashboardQueries();

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
              <p className="text-destructive">{t('errorLoadingUser')}</p>
            </CardContent>
          </Card>
        )}

        <PrimaryStatCards
          coursesEnrolled={coursesEnrolled}
          totalMinutesDisplay={totalMinutesDisplay}
          conceptsMastered={conceptsMastered}
          isStatsFetching={statsResult.fetching}
        />

        <SecondaryStatCards
          coursesEnrolled={coursesEnrolled}
          annotationsCreated={annotationsCreated}
        />

        <DailyLearningWidget />
        <SRSWidget />
        <LeaderboardWidget />
        <SkillGapWidget />

        {/* Course Progress + Weekly Stats */}
        <div className="relative">
          <span className="absolute -top-2 right-3 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            BETA DATA
          </span>
          <LearningStats
            courses={MOCK_COURSE_PROGRESS}
            weeklyStats={MOCK_WEEKLY_STATS}
          />
        </div>

        {/* Activity Heatmap */}
        <Card className="relative">
          <span className="absolute -top-2 right-3 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            BETA DATA
          </span>
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
            <span className="absolute -top-2 right-3 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              BETA DATA
            </span>
            <CardHeader>
              <CardTitle>{t('recentActivity')}</CardTitle>
              <CardDescription>{t('latestEvents')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={MOCK_ACTIVITY_FEED} />
            </CardContent>
          </Card>
          <DashboardProfileCard meResult={meResult} localUser={localUser} />
        </div>
      </div>
    </Layout>
  );
}
