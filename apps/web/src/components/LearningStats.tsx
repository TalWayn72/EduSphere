import { useTranslation } from 'react-i18next';
import { CourseProgress, WeeklyStats } from '@/lib/mock-analytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

interface LearningStatsProps {
  courses: CourseProgress[];
  weeklyStats: WeeklyStats[];
}

interface SparklineBarProps {
  value: number;
  max: number;
  label: string;
}

function SparklineBar({ value, max, label }: SparklineBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className="flex flex-col items-center gap-1"
      title={`${label}: ${value}`}
    >
      <div
        className="w-6 bg-muted rounded-t relative"
        style={{ height: '40px' }}
      >
        <div
          className="absolute bottom-0 w-full bg-primary rounded-t"
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{label.slice(-1)}</span>
    </div>
  );
}

function CourseProgressBar({ course }: { course: CourseProgress }) {
  const { t } = useTranslation('dashboard');
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[200px]">
            {course.title}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {course.progress}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${course.progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t('lastStudied', { date: course.lastStudied })} ·{' '}
        {Math.round(course.totalMinutes / 60)}h {t('total')}
      </p>
    </div>
  );
}

export function LearningStats({ courses, weeklyStats }: LearningStatsProps) {
  const { t } = useTranslation('dashboard');
  const maxMinutes = Math.max(...weeklyStats.map((w) => w.studyMinutes));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t('courseProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {courses.map((course) => (
            <CourseProgressBar key={course.id} course={course} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t('weeklyStudyTime')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-16">
            {weeklyStats.map((week) => (
              <SparklineBar
                key={week.week}
                value={week.studyMinutes}
                max={maxMinutes}
                label={week.week}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">{t('avgPerWeek')}</span>
              <p className="font-medium">
                {Math.round(
                  weeklyStats.reduce((s, w) => s + w.studyMinutes, 0) /
                    weeklyStats.length
                )}{' '}
                {t('min')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('bestWeek')}</span>
              <p className="font-medium">
                {maxMinutes} {t('min')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
