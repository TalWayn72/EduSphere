/** Pure utility functions for ActivityHeatmap component */

/**
 * Map an activity count to a Tailwind CSS colour class.
 * Thresholds: 0 → muted, 1-2 → green-200, 3-4 → green-400,
 *             5-6 → green-600, 7+ → green-800
 */
export function getHeatmapColor(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 2) return 'bg-green-200 dark:bg-green-900';
  if (count <= 4) return 'bg-green-400 dark:bg-green-700';
  if (count <= 6) return 'bg-green-600 dark:bg-green-500';
  return 'bg-green-800 dark:bg-green-300';
}

/**
 * Format an ISO date string as "Mon DD" (e.g. "Jan 15").
 */
export function formatHeatmapDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate summary statistics from heatmap data.
 */
export function calcHeatmapStats(
  data: { date: string; count: number }[]
): { totalStudyDays: number; totalSessions: number } {
  return {
    totalStudyDays: data.filter((d) => d.count > 0).length,
    totalSessions: data.reduce((sum, d) => sum + d.count, 0),
  };
}
