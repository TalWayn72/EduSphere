import { Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StreakIndicatorProps {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Displays the user's current daily-activity streak and their all-time
 * longest streak. Data is computed server-side from weeklyActivity in
 * UserStatsService.computeStreaks().
 */
export function StreakIndicator({
  currentStreak,
  longestStreak,
}: StreakIndicatorProps) {
  const { t } = useTranslation('dashboard');

  const isActive = currentStreak > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {t('stats.streak', 'Learning Streak')}
        </CardTitle>
        <Flame
          className={`h-4 w-4 ${isActive ? 'text-orange-500' : 'text-muted-foreground'}`}
          aria-hidden="true"
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1">
          <span className="text-2xl font-bold">{currentStreak}</span>
          <span className="text-sm text-muted-foreground mb-0.5">
            {t('stats.days', 'days')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('stats.longestStreak', 'Best: {{count}} days', {
            count: longestStreak,
          })}
        </p>
      </CardContent>
    </Card>
  );
}
