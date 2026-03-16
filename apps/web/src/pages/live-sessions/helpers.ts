// ─── Live Sessions Helpers ───────────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Started';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Starts in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Starts in ${hours}h`;
  return `Starts in ${Math.floor(hours / 24)}d`;
}
