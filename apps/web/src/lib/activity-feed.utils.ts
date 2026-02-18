/** Pure utility functions for ActivityFeed component */

/**
 * Format an ISO timestamp as a relative time string.
 * @example formatRelativeTime('2024-01-01T10:00:00Z') → '3d ago'
 */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
