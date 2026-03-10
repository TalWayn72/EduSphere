interface ChallengeCardProps {
  challenge: {
    id: string;
    title: string;
    description?: string | null;
    challengeType: string;
    targetScore: number;
    startDate: string;
    endDate: string;
    maxParticipants: number;
    participantCount: number;
    status: string;
  };
  onJoin: (id: string) => void;
  isJoining?: boolean;
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  QUIZ: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PROJECT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  DISCUSSION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ChallengeCard({ challenge, onJoin, isJoining = false }: ChallengeCardProps) {
  const badgeClass = TYPE_BADGE_CLASSES[challenge.challengeType] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  const fillPercent = challenge.maxParticipants > 0
    ? Math.min(100, Math.round((challenge.participantCount / challenge.maxParticipants) * 100))
    : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{challenge.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
          {challenge.challengeType}
        </span>
      </div>

      {challenge.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{challenge.description}</p>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{challenge.participantCount} / {challenge.maxParticipants} participants</span>
          <span>{fillPercent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${fillPercent}%` }}
            role="progressbar"
            aria-valuenow={fillPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>Start: {formatDate(challenge.startDate)}</span>
        <span className="text-border">|</span>
        <span>End: {formatDate(challenge.endDate)}</span>
      </div>

      <button
        onClick={() => onJoin(challenge.id)}
        disabled={isJoining || challenge.status !== 'ACTIVE'}
        className="mt-1 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isJoining ? 'Joining...' : 'Join'}
      </button>
    </div>
  );
}
