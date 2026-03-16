export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 animate-pulse" data-testid="session-skeleton">
      <div className="flex justify-between">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-16" />
      </div>
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-8 bg-muted rounded" />
    </div>
  );
}
