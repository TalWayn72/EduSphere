import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen, Clock, Brain, FileText, Users, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrimaryStatsProps {
  coursesEnrolled: number | null;
  totalMinutesDisplay: string;
  conceptsMastered: number;
  isStatsFetching: boolean;
}

export function PrimaryStatCards({
  coursesEnrolled,
  totalMinutesDisplay,
  conceptsMastered,
  isStatsFetching,
}: PrimaryStatsProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('stats.coursesEnrolled')}
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {coursesEnrolled === null ? '...' : coursesEnrolled}
          </div>
          <p className="text-xs text-muted-foreground">Available in catalog</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            {t('stats.studyTime')}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              BETA
            </span>
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMinutesDisplay}</div>
          <p className="text-xs text-muted-foreground">
            Estimated — real tracking coming soon
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            {t('stats.conceptsMastered')}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              BETA
            </span>
          </CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isStatsFetching ? '...' : conceptsMastered}
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated — real tracking coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface SecondaryStatsProps {
  coursesEnrolled: number | null;
  annotationsCreated: number | null;
}

export function SecondaryStatCards({
  coursesEnrolled,
  annotationsCreated,
}: SecondaryStatsProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('stats.activeCourses')}
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {coursesEnrolled === null ? '...' : coursesEnrolled}
          </div>
          <p className="text-xs text-muted-foreground">Available in catalog</p>
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
            <Bot className="h-4 w-4 inline mr-1 text-muted-foreground" />—
          </div>
          <p className="text-xs text-muted-foreground">Active collaborations</p>
        </CardContent>
      </Card>
    </div>
  );
}
