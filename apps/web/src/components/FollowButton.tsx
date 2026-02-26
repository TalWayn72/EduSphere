import React from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import {
  FOLLOW_USER_MUTATION,
  UNFOLLOW_USER_MUTATION,
} from '@/lib/graphql/profile.queries';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  followersCount: number;
}

export function FollowButton({
  userId,
  initialIsFollowing,
  followersCount,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = React.useState(initialIsFollowing);
  const [localCount, setLocalCount] = React.useState(followersCount);

  const [followResult, follow] = useMutation<{ followUser: boolean }>(
    FOLLOW_USER_MUTATION
  );
  const [unfollowResult, unfollow] = useMutation<{ unfollowUser: boolean }>(
    UNFOLLOW_USER_MUTATION
  );

  const isLoading = followResult.fetching || unfollowResult.fetching;

  const handleToggle = async () => {
    if (isLoading) return;

    if (isFollowing) {
      const result = await unfollow({ userId });
      if (!result.error) {
        setIsFollowing(false);
        setLocalCount((c) => Math.max(0, c - 1));
      }
    } else {
      const result = await follow({ userId });
      if (!result.error) {
        setIsFollowing(true);
        setLocalCount((c) => c + 1);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isFollowing ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className="shrink-0"
        aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
      >
        {isLoading ? (
          <span className="animate-spin h-3 w-3 border border-current rounded-full border-t-transparent mr-1" />
        ) : null}
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Users className="h-3.5 w-3.5" />
        {localCount}
      </span>
    </div>
  );
}
