import { DailyActivity } from '@/lib/mock-analytics';

interface ActivityHeatmapProps {
  data: DailyActivity[];
}

function getColor(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 2) return 'bg-green-200 dark:bg-green-900';
  if (count <= 4) return 'bg-green-400 dark:bg-green-700';
  if (count <= 6) return 'bg-green-600 dark:bg-green-500';
  return 'bg-green-800 dark:bg-green-300';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Group into weeks (columns)
  const weeks: DailyActivity[][] = [];
  let currentWeek: DailyActivity[] = [];

  // Pad start to align to Sunday
  const firstDate = new Date(data[0]?.date ?? '');
  const startDayOfWeek = firstDate.getDay();
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: '', count: -1 });
  }

  data.forEach((day, idx) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || idx === data.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const totalStudyDays = data.filter((d) => d.count > 0).length;
  const totalSessions = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${
                  day.count === -1 ? 'invisible' : getColor(day.count)
                }`}
                title={
                  day.date
                    ? `${formatDate(day.date)}: ${day.count} sessions`
                    : ''
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalStudyDays} study days in the last 12 weeks</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {[0, 2, 4, 6, 8].map((c) => (
            <div key={c} className={`w-3 h-3 rounded-sm ${getColor(c)}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {totalSessions} total study sessions
      </p>
    </div>
  );
}
