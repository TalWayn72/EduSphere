import { useQuery } from 'urql';
import { Card } from '@/components/ui/card';
import { MY_BADGES_QUERY } from '@/lib/graphql/gamification.queries';

interface BadgeData {
  id: string;
  name: string;
  description: string;
  iconEmoji: string;
  category: string;
  pointsReward: number;
}

interface UserBadgeData {
  id: string;
  earnedAt: string;
  badge: BadgeData;
}

interface MyBadgesResult {
  myBadges: UserBadgeData[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface BadgesGridProps {
  badges?: UserBadgeData[];
}

function BadgeCard({ userBadge }: { userBadge: UserBadgeData }) {
  return (
    <Card className="p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow">
      <span className="text-4xl" role="img" aria-label={userBadge.badge.name}>
        {userBadge.badge.iconEmoji}
      </span>
      <p className="font-semibold text-sm">{userBadge.badge.name}</p>
      <p className="text-xs text-muted-foreground line-clamp-2">{userBadge.badge.description}</p>
      <span className="mt-auto text-xs text-primary font-medium">+{userBadge.badge.pointsReward} pts</span>
      <time className="text-xs text-muted-foreground">{formatDate(userBadge.earnedAt)}</time>
    </Card>
  );
}

export function BadgesGrid({ badges: propBadges }: BadgesGridProps) {
  const [result] = useQuery<MyBadgesResult>({
    query: MY_BADGES_QUERY,
    pause: !!propBadges,
  });

  const badges = propBadges ?? result.data?.myBadges ?? [];
  const loading = !propBadges && result.fetching;

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 h-32 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="text-4xl">🏆</span>
        <p className="mt-2 text-sm">No badges earned yet — keep learning!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {badges.map((ub) => <BadgeCard key={ub.id} userBadge={ub} />)}
    </div>
  );
}
