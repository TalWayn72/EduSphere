/**
 * SocialFeedPage — Social learning activity stream.
 * Route: /social
 * Shows: Following Activity, Recommended Content, link to Find People.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search } from 'lucide-react';
import {
  SOCIAL_FEED_QUERY,
  SOCIAL_RECOMMENDATIONS_QUERY,
} from '@/lib/graphql/social.queries';
import FeedItem, { type SocialFeedItemData } from '@/components/social/FeedItem';

interface RecommendationItem {
  contentItemId: string;
  contentTitle: string;
  followersCount: number;
  isMutualFollower: boolean;
  lastActivity: string;
}

interface SocialFeedData {
  socialFeed: SocialFeedItemData[];
}

interface RecommendationsData {
  socialRecommendations: RecommendationItem[];
}

export function SocialFeedPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data: feedData, fetching: feedFetching }] = useQuery<SocialFeedData>({
    query: SOCIAL_FEED_QUERY,
    variables: { limit: 20 },
    pause: !mounted,
  });

  const [{ data: recsData, fetching: recsFetching }] =
    useQuery<RecommendationsData>({
      query: SOCIAL_RECOMMENDATIONS_QUERY,
      variables: { limit: 5 },
      pause: !mounted,
    });

  const feed = feedData?.socialFeed ?? [];
  const recs = recsData?.socialRecommendations ?? [];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 max-w-3xl">
        {/* Page heading */}
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold">Social Feed</h1>
        </div>

        {/* Following Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Following Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {(!mounted || feedFetching) && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            )}

            {mounted && !feedFetching && feed.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Follow learners to see their activity here
              </p>
            )}

            {mounted && !feedFetching && feed.length > 0 && (
              <ul
                className="divide-y divide-border"
                aria-label="Following activity feed"
              >
                {feed.map((item) => (
                  <FeedItem key={item.id} item={item} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recommended Content */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recommended Content</CardTitle>
          </CardHeader>
          <CardContent>
            {(!mounted || recsFetching) && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            )}

            {mounted && !recsFetching && recs.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recommendations yet. Start following people to get personalised
                suggestions.
              </p>
            )}

            {mounted && !recsFetching && recs.length > 0 && (
              <ul className="divide-y divide-border" aria-label="Recommended content">
                {recs.map((rec) => (
                  <li key={rec.contentItemId} className="py-3">
                    <p className="text-sm font-medium">{rec.contentTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rec.followersCount} follower
                      {rec.followersCount !== 1 ? 's' : ''} completed this
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Find People CTA */}
        <Card>
          <CardContent className="py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Find People to Follow</p>
                <p className="text-xs text-muted-foreground">
                  Discover other learners and grow your network
                </p>
              </div>
            </div>
            <Link
              to="/people"
              className="text-sm font-medium text-primary hover:underline"
            >
              Browse
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
