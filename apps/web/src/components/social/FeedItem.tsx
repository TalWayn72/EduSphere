/**
 * FeedItem — renders a single social feed activity entry.
 * Format: "[Avatar] Alice completed React Fundamentals · 2h ago"
 */

export type FeedVerb =
  | 'COMPLETED'
  | 'ENROLLED'
  | 'ACHIEVED_BADGE'
  | 'DISCUSSED'
  | 'STARTED_LEARNING';

export interface SocialFeedItemData {
  id: string;
  actorId: string;
  actorDisplayName: string;
  verb: FeedVerb | string;
  objectType: string;
  objectId: string;
  objectTitle: string;
  createdAt: string;
}

const VERB_LABELS: Record<string, string> = {
  COMPLETED: 'completed',
  ENROLLED: 'started',
  ACHIEVED_BADGE: 'earned',
  DISCUSSED: 'posted in',
  STARTED_LEARNING: 'is learning',
};

function getVerbLabel(verb: string): string {
  return VERB_LABELS[verb] ?? verb.toLowerCase();
}

function getRelativeTime(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function getInitial(displayName: string): string {
  return (displayName[0] ?? '?').toUpperCase();
}

interface FeedItemProps {
  item: SocialFeedItemData;
}

export default function FeedItem({ item }: FeedItemProps) {
  return (
    <li className="flex items-start gap-3 py-3">
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary"
        aria-hidden="true"
      >
        {getInitial(item.actorDisplayName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold">{item.actorDisplayName}</span>{' '}
          <span className="text-muted-foreground">{getVerbLabel(item.verb)}</span>{' '}
          <span className="font-medium">{item.objectTitle}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getRelativeTime(item.createdAt)}
        </p>
      </div>
    </li>
  );
}
