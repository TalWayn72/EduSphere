/**
 * PeerReviewPage — displays assignments to review and the user's own submissions.
 * Route: /peer-review
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import {
  MY_REVIEW_ASSIGNMENTS_QUERY,
  MY_SUBMISSIONS_QUERY,
} from '@/lib/graphql/peer-review.queries';

interface ReviewAssignment {
  id: string;
  contentItemId: string;
  contentItemTitle: string;
  submitterId: string;
  submitterDisplayName?: string;
  status: string;
  submissionText?: string;
  createdAt: string;
}

interface Submission {
  id: string;
  contentItemId: string;
  contentItemTitle: string;
  status: string;
  score?: number;
  feedback?: string;
  createdAt: string;
}

interface AssignmentsData {
  myReviewAssignments: ReviewAssignment[];
}

interface SubmissionsData {
  mySubmissions: Submission[];
}

function statusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'SUBMITTED' || status === 'RATED') return 'default';
  if (status === 'PENDING') return 'secondary';
  return 'outline';
}

export function PeerReviewPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data: assignmentsData, fetching: fetchingAssignments }] =
    useQuery<AssignmentsData>({
      query: MY_REVIEW_ASSIGNMENTS_QUERY,
      pause: !mounted,
    });

  const [{ data: submissionsData, fetching: fetchingSubmissions }] =
    useQuery<SubmissionsData>({
      query: MY_SUBMISSIONS_QUERY,
      pause: !mounted,
    });

  const assignments = assignmentsData?.myReviewAssignments ?? [];
  const submissions = submissionsData?.mySubmissions ?? [];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center gap-3">
          <Star className="h-8 w-8 text-indigo-500" aria-hidden="true" />
          <h1 className="text-3xl font-bold">Peer Review</h1>
        </div>

        {/* ── Assignments to Review ──────────────────────────────────────── */}
        <section aria-labelledby="assignments-heading">
          <h2
            id="assignments-heading"
            className="text-xl font-semibold mb-4"
          >
            Assignments to Review
          </h2>

          {!mounted || fetchingAssignments ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending review assignments
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{a.contentItemTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        By: {a.submitterDisplayName ?? 'Anonymous'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                      <Link
                        to={`/peer-review/${a.id}`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Start Review
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── My Submissions ────────────────────────────────────────────── */}
        <section aria-labelledby="submissions-heading">
          <h2
            id="submissions-heading"
            className="text-xl font-semibold mb-4"
          >
            My Submissions
          </h2>

          {!mounted || fetchingSubmissions ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                You haven&apos;t submitted any work for peer review yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{s.contentItemTitle}</CardTitle>
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {s.score !== undefined && s.score !== null && (
                      <p className="text-xs text-muted-foreground">
                        Score: <span className="font-semibold">{s.score}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
