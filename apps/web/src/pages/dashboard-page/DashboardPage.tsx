import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, BookOpen, CheckCircle, Zap, Clock, ChevronRight } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CourseCard } from './CourseCard';
import { ActivityIcon } from './ActivityIcon';
import { useDashboardData } from './useDashboardData';

export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');

  const {
    displayName,
    showOnboardingBanner,
    setOnboardingDismissed,
    enrolledCount,
    completedCount,
    inProgressCourses,
    recommendedCourses,
    activity,
    streak,
    xp,
    level,
    masteryTopics,
  } = useDashboardData();

  return (
    <Layout>
      <PageShell size="2xl" spacing="relaxed">

        {/* Onboarding banner */}
        {showOnboardingBanner && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg" aria-hidden>📚</span>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Complete your profile setup to get personalized recommendations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/onboarding">
                <Button size="sm" variant="default" className="text-xs">Continue Setup</Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => setOnboardingDismissed(true)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Section 1 — Welcome Hero */}
        <section aria-labelledby="welcome-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                id="welcome-heading"
                className="text-3xl font-bold tracking-tight"
                data-testid="welcome-heading"
              >
                {t('welcomeBack', { name: displayName })} 👋
              </h1>
              <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
            </div>

            {/* Streak + Quick stats */}
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5"
                data-testid="streak-widget"
              >
                <Flame className="h-5 w-5 streak-active" aria-hidden />
                <span className="text-sm font-semibold text-foreground">
                  {t('dayStreak', { count: streak })}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                  {t('inProgress', { count: enrolledCount })}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                <CheckCircle className="h-4 w-4 text-success" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                  {t('completed', { count: completedCount })}
                </span>
              </div>

              <div
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5"
                data-testid="xp-widget"
              >
                <Zap className="h-4 w-4 text-accent" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                  {t('xpPoints', { count: xp })}
                </span>
                <span
                  className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent"
                  data-testid="xp-level-badge"
                  aria-label={`Level ${level}`}
                >
                  {`Lv. ${level}`}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sections 2 + 3 — Continue Learning + Mastery Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Section 2 — Continue Learning (8 cols) */}
          <section
            aria-labelledby="continue-learning-heading"
            className="lg:col-span-8"
            data-testid="continue-learning-section"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle id="continue-learning-heading" className="text-base">
                  {t('continueLearning')}
                </CardTitle>
                <Link
                  to="/courses"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {tCommon('viewAll')}
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                  {inProgressCourses.map((course) => (
                    <CourseCard key={course.id} course={course} progressLabel={t('progress')} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 3 — Mastery Overview (4 cols) */}
          <section
            aria-labelledby="mastery-heading"
            className="lg:col-span-4"
            data-testid="mastery-overview"
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle id="mastery-heading" className="text-base">
                  {t('masteryOverview')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {masteryTopics.map(({ topic, level: masteryLevel }) => (
                  <div key={topic} className="flex items-center justify-between gap-2" dir="ltr">
                    <span className="text-sm text-foreground truncate">{topic}</span>
                    <MasteryBadge level={masteryLevel} size="sm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sections 4 + 5 — Recent Activity + Recommended */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Section 4 — Recent Activity (6 cols) */}
          <section
            aria-labelledby="recent-activity-heading"
            className="lg:col-span-6"
            data-testid="recent-activity"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle id="recent-activity-heading" className="text-base">
                  {t('recentActivity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3" aria-label="Recent learning activities">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3" dir="ltr">
                      <ActivityIcon type={item.icon} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-tight">{item.action}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" aria-hidden />
                          {item.timeAgo}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>

          {/* Section 5 — Recommended (6 cols) */}
          <section
            aria-labelledby="recommendations-heading"
            className="lg:col-span-6"
            data-testid="recommendations"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle id="recommendations-heading" className="text-base">
                  {t('recommendedForYou')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="flex items-start gap-3 rounded-lg p-3 border border-border hover:bg-card-hover transition-colors"
                    aria-label={`Explore ${course.title}`}
                    dir="ltr"
                  >
                    <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.instructor}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 mt-0.5" aria-hidden />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </PageShell>
    </Layout>
  );
}
