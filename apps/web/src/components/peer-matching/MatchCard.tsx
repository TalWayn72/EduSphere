interface MatchCardProps {
  userId: string;
  matchReason: string;
  complementarySkills: string[];
  sharedCourseCount: number;
  onConnect: (userId: string) => void;
  isConnecting?: boolean;
}

export function MatchCard({
  userId,
  matchReason,
  complementarySkills,
  sharedCourseCount,
  onConnect,
  isConnecting = false,
}: MatchCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
          {userId.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Learner {userId.slice(0, 6)}
          </p>
          <p className="text-xs text-muted-foreground">{sharedCourseCount} shared course{sharedCourseCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">{matchReason}</p>

      {complementarySkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {complementarySkills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {skill}
            </span>
          ))}
          {complementarySkills.length > 5 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{complementarySkills.length - 5} more
            </span>
          )}
        </div>
      )}

      <button
        onClick={() => onConnect(userId)}
        disabled={isConnecting}
        className="mt-1 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
}
