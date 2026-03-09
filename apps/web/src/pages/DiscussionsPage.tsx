/**
 * DiscussionsPage — Lists all discussions the current user participates in.
 * Route: /discussions
 */
import { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users } from 'lucide-react';
import { MY_DISCUSSIONS_QUERY } from '@/lib/graphql/discussion.queries';

interface Discussion {
  id: string;
  title: string;
  courseId: string;
  participantsCount: number;
  messagesCount: number;
  createdAt: string;
}

interface MyDiscussionsData {
  myDiscussions: Discussion[];
}

export function DiscussionsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<MyDiscussionsData>({
    query: MY_DISCUSSIONS_QUERY,
    variables: { limit: 20 },
    pause: !mounted,
  });

  const discussions = data?.myDiscussions ?? [];

  if (fetching) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Discussions</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold">Discussions</h1>
        </div>

        {discussions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No discussions yet — join a course to start discussing!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {discussions.map((discussion) => (
              <Link key={discussion.id} to={`/discussions/${discussion.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{discussion.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" aria-hidden />
                        {discussion.messagesCount} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" aria-hidden />
                        {discussion.participantsCount} participants
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(discussion.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
