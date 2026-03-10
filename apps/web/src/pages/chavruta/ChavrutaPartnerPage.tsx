import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FIND_CHAVRUTA_PARTNERS_QUERY,
  CREATE_CHAVRUTA_SESSION_MUTATION,
} from '@/lib/graphql/chavruta-partner.queries';

interface ChavrutaMatch {
  partnerId: string;
  partnerName: string;
  courseId: string;
  topic: string;
  matchReason: string;
  compatibilityScore: number;
}

export function ChavrutaPartnerPage() {
  const [courseId, setCourseId] = useState('');
  const [mounted, setMounted] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery({
    query: FIND_CHAVRUTA_PARTNERS_QUERY,
    variables: { input: { courseId } },
    pause: !mounted || courseId.length < 3,
  });

  const [{ fetching: creating }, createSession] = useMutation(
    CREATE_CHAVRUTA_SESSION_MUTATION,
  );

  const handleRequestPartner = async (partnerId: string, topic: string) => {
    setSelectedPartnerId(partnerId);
    const result = await createSession({ input: { partnerId, courseId, topic } });
    if (result.error) {
      console.error(
        '[ChavrutaPartnerPage] Failed to create session:',
        result.error.message,
      );
    }
  };

  const matches: ChavrutaMatch[] = data?.chavrutaPartnerMatches ?? [];

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Find a Chavruta Partner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find a debate partner with complementary knowledge to deepen your understanding
            through Socratic dialogue.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Enter course ID..."
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="flex-1"
            aria-label="Course ID"
          />
        </div>

        {fetching && (
          <p className="text-sm text-muted-foreground">Searching for partners...</p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            Failed to load partners. Please try again.
          </p>
        )}
        {!fetching && !error && courseId.length >= 3 && matches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No partners found for this course yet.
          </p>
        )}

        <div className="space-y-4" role="list" aria-label="Chavruta partner candidates">
          {matches.map((match) => (
            <Card key={match.partnerId} role="listitem">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{match.partnerName}</span>
                  <Badge variant="secondary">
                    {Math.round(match.compatibilityScore * 100)}% match
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-1 text-sm text-muted-foreground">{match.matchReason}</p>
                <p className="mb-3 text-sm">
                  <span className="font-medium">Suggested topic:</span> {match.topic}
                </p>
                <Button
                  size="sm"
                  onClick={() => handleRequestPartner(match.partnerId, match.topic)}
                  disabled={creating && selectedPartnerId === match.partnerId}
                  aria-label={`Request Chavruta session with ${match.partnerName}`}
                >
                  {creating && selectedPartnerId === match.partnerId
                    ? 'Sending...'
                    : 'Request Session'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
