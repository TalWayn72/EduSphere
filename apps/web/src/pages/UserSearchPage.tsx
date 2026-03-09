/**
 * UserSearchPage — Social Learning: Search for other users
 * Route: /people
 * Phase 45: Public Profile & Follow System
 */
import React, { useState } from 'react';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import { FollowButton } from '@/components/FollowButton';
import { SEARCH_USERS_QUERY } from '@/lib/graphql/social.queries';

interface SearchUserResult {
  userId: string;
  displayName: string;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
}

interface SearchUsersData {
  searchUsers: SearchUserResult[];
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((p) => p[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
}

export function UserSearchPage() {
  const [query, setQuery] = useState('');

  const [{ data, fetching }] = useQuery<SearchUsersData>({
    query: SEARCH_USERS_QUERY,
    variables: { query, limit: 20 },
    pause: query.length < 3,
  });

  const results: SearchUserResult[] = data?.searchUsers ?? [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold">Find People</h1>
        </div>

        <Input
          placeholder="Search people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search people"
          className="text-base"
        />

        {query.length < 3 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Enter at least 3 characters to search
          </p>
        )}

        {query.length >= 3 && fetching && (
          <div className="flex justify-center py-8">
            <span className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent" />
          </div>
        )}

        {query.length >= 3 && !fetching && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No users found for &ldquo;{query}&rdquo;
          </p>
        )}

        {results.length > 0 && (
          <ul className="space-y-3">
            {results.map((user) => (
              <li key={user.userId}>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">
                        {user.displayName}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {user.bio}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {user.followersCount} followers
                      </p>
                    </div>
                    <FollowButton
                      userId={user.userId}
                      initialIsFollowing={user.isFollowedByMe}
                      followersCount={user.followersCount}
                    />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
