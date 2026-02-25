/**
 * SocialFeedWidget — "Following Activity" dashboard widget (F-036).
 * Shows recent learning activity of users the current learner follows.
 */
import { useQuery } from 'urql';
import { Users } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { SOCIAL_FEED_QUERY } from '@/lib/graphql/knowledge.queries';

interface SocialFeedItem {
  userId: string;
  userDisplayName: string;
  action: string;
  contentItemId: string;
  contentTitle: string;
  timestamp: string;
}

const MAX_FEED_ITEMS = 5;

function getActionLabel(action: string): string {
  if (action === 'completed') return 'completed';
  if (action === 'progressed') return 'is making progress on';
  return 'started';
}

function getRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function getInitials(displayName: string): string {
  return displayName.slice(0, 2).toUpperCase();
}

function FeedItemRow({ item }: { item: SocialFeedItem }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
        {getInitials(item.userDisplayName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-medium">{item.userDisplayName}</span>
          {' '}
          <span className="text-muted-foreground">{getActionLabel(item.action)}</span>
          {' '}
          <span className="font-medium truncate">{item.contentTitle}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getRelativeTime(item.timestamp)}
        </p>
      </div>
    </li>
  );
}

export function SocialFeedWidget() {
  const [{ data, fetching }] = useQuery<{ socialFeed: SocialFeedItem[] }>({
    query: SOCIAL_FEED_QUERY,
    variables: { limit: MAX_FEED_ITEMS },
  });

  const feed = data?.socialFeed ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Users className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Following Activity</CardTitle>
      </CardHeader>

      <CardContent>
        {fetching && (
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        )}

        {!fetching && feed.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Follow learners to see their activity
          </p>
        )}

        {!fetching && feed.length > 0 && (
          <ul className="divide-y divide-border -mx-1 px-1">
            {feed.map((item) => (
              <FeedItemRow key={`${item.userId}-${item.contentItemId}-${item.timestamp}`} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
