import React from 'react';
import { useQuery } from 'urql';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MY_FOLLOWERS_QUERY,
  MY_FOLLOWING_QUERY,
} from '@/lib/graphql/profile.queries';
import { FollowButton } from '@/components/FollowButton';

interface FollowersListProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
}

interface FollowersData {
  myFollowers: string[];
}
interface FollowingData {
  myFollowing: string[];
}

function UserIdRow({ userId }: { userId: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {userId.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-muted-foreground truncate">
          {userId}
        </p>
      </div>
      <FollowButton
        userId={userId}
        initialIsFollowing={false}
        followersCount={0}
      />
    </li>
  );
}

export function FollowersList({
  userId: _userId,
  type,
  isOpen,
  onClose,
}: FollowersListProps) {
  const title = type === 'followers' ? 'Followers' : 'Following';

  const [followersResult] = useQuery<FollowersData>({
    query: MY_FOLLOWERS_QUERY,
    variables: { limit: 50 },
    pause: true, // myFollowers not in live gateway
  });

  const [followingResult] = useQuery<FollowingData>({
    query: MY_FOLLOWING_QUERY,
    variables: { limit: 50 },
    pause: true, // myFollowing not in live gateway
  });

  const fetching =
    type === 'followers' ? followersResult.fetching : followingResult.fetching;

  const ids: string[] =
    type === 'followers'
      ? (followersResult.data?.myFollowers ?? [])
      : (followingResult.data?.myFollowing ?? []);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {fetching ? (
          <div className="flex justify-center py-8">
            <span className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent" />
          </div>
        ) : ids.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {type === 'followers'
              ? 'No followers yet.'
              : 'Not following anyone yet.'}
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <ul className="space-y-3 pr-2">
              {ids.map((id) => (
                <UserIdRow key={id} userId={id} />
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
