export function SkeletonCard() {
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden animate-pulse"
      aria-hidden="true"
      data-testid="skeleton-card"
    >
      <div className="aspect-video bg-muted" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-8 w-full rounded bg-muted mt-1" />
      </div>
    </div>
  );
}
