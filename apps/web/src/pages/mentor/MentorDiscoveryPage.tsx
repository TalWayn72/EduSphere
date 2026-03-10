import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MENTORS_BY_PATH_QUERY,
  REQUEST_MENTOR_MATCH_MUTATION,
} from '@/lib/graphql/mentor-discovery.queries';

interface MentorMatch {
  mentorId: string;
  pathOverlapScore: number;
  sharedConcepts: string[];
}

export function MentorDiscoveryPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery({
    query: MENTORS_BY_PATH_QUERY,
    variables: { courseId },
    pause: !mounted || !courseId,
  });

  const [{ fetching: requesting }, requestMatch] = useMutation(
    REQUEST_MENTOR_MATCH_MUTATION,
  );

  const mentors: MentorMatch[] = data?.mentorsByPathTopology ?? [];

  const handleRequestMentor = async (mentorId: string) => {
    const result = await requestMatch({ matchedUserId: mentorId, courseId });
    if (result.error) {
      console.error(
        '[MentorDiscoveryPage] Failed to request mentor match:',
        result.error.message,
      );
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Find a Mentor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect with learners who have already traversed your learning path.
          </p>
        </div>

        {!courseId && (
          <p className="text-sm text-muted-foreground">
            No course selected. Navigate here from a course page to find mentors.
          </p>
        )}

        {fetching && (
          <p className="text-sm text-muted-foreground">Finding mentors...</p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            Failed to load mentors.
          </p>
        )}
        {!fetching && !error && courseId && mentors.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No mentors found yet. Be the first to complete this path!
          </p>
        )}

        <div className="space-y-4" role="list" aria-label="Mentor candidates">
          {mentors.map((mentor) => (
            <Card key={mentor.mentorId} role="listitem">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Mentor {mentor.mentorId.slice(0, 8)}</span>
                  <Badge variant="secondary">
                    {Math.round(mentor.pathOverlapScore * 100)}% path overlap
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mentor.sharedConcepts.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1" aria-label="Shared concepts">
                    {mentor.sharedConcepts.slice(0, 5).map((concept) => (
                      <Badge key={concept} variant="outline" className="text-xs">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => handleRequestMentor(mentor.mentorId)}
                  disabled={requesting}
                  aria-label={`Request mentoring from ${mentor.mentorId}`}
                >
                  {requesting ? 'Requesting...' : 'Request Mentoring'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
