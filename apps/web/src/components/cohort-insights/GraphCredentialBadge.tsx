import { Badge } from '@/components/ui/badge';

export interface GraphCredentialBadgeProps {
  /** Credential label (e.g. "Graph Expert — Algorithms") */
  label: string;
  /** Number of graph-grounded concepts supporting this credential */
  conceptCount: number;
  /** Optional verification URL for this credential */
  verifyUrl?: string;
}

/**
 * GraphCredentialBadge — displays a badge for a knowledge-graph-grounded credential.
 *
 * The badge is graph-grounded: the conceptCount reflects how many knowledge graph
 * nodes were traversed to validate the learner's mastery.
 */
export function GraphCredentialBadge({
  label,
  conceptCount,
  verifyUrl,
}: GraphCredentialBadgeProps) {
  const content = (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true">🏅</span>
      <span className="font-medium">{label}</span>
      <Badge variant="secondary" className="text-xs">
        {conceptCount} concept{conceptCount !== 1 ? 's' : ''}
      </Badge>
    </span>
  );

  if (verifyUrl) {
    return (
      <a
        href={verifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-800 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
        aria-label={`Verify graph credential: ${label} (${conceptCount} concept${conceptCount !== 1 ? 's' : ''})`}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
      role="img"
      aria-label={`Graph credential: ${label} (${conceptCount} concept${conceptCount !== 1 ? 's' : ''})`}
    >
      {content}
    </span>
  );
}
