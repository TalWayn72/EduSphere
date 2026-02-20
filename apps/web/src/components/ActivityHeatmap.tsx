import {
  getHeatmapColor,
  formatHeatmapDate,
  calcHeatmapStats,
} from '@/lib/heatmap.utils';

export interface HeatmapDay {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Group into weeks (columns)
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

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

  const { totalStudyDays, totalSessions } = calcHeatmapStats(data);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${
                  day.count === -1 ? 'invisible' : getHeatmapColor(day.count)
                }`}
                title={
                  day.date
                    ? `${formatHeatmapDate(day.date)}: ${day.count} sessions`
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
            <div key={c} className={`w-3 h-3 rounded-sm ${getHeatmapColor(c)}`} />
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
