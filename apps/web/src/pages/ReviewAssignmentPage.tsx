/**
 * ReviewAssignmentPage — submit a peer review for a specific assignment.
 * Route: /peer-review/:id
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import RubricScorer, { type RubricCriterion } from '@/components/peer-review/RubricScorer';
import { SUBMIT_PEER_REVIEW_MUTATION } from '@/lib/graphql/peer-review.queries';

const DEFAULT_CRITERIA: RubricCriterion[] = [
  {
    id: 'c1',
    label: 'Content Quality',
    description: 'How well does the submission address the topic?',
    maxScore: 5,
  },
  {
    id: 'c2',
    label: 'Clarity',
    description: 'How clear and well-organized is the submission?',
    maxScore: 5,
  },
  {
    id: 'c3',
    label: 'Depth',
    description: 'How thoroughly does the submission explore the topic?',
    maxScore: 5,
  },
];

export function ReviewAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [{ fetching }, submitReview] = useMutation(SUBMIT_PEER_REVIEW_MUTATION);

  const handleSubmit = async () => {
    if (!id) return;
    const criteriaScores = JSON.stringify(scores);
    const result = await submitReview({
      assignmentId: id,
      criteriaScores,
      feedback: feedback || undefined,
    });
    if (!result.error) {
      setSubmitted(true);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/peer-review"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Peer Review
          </Link>
        </div>

        <h1 className="text-2xl font-bold">Submit Review</h1>

        {submitted ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden="true" />
              <p className="text-lg font-semibold">Review submitted successfully!</p>
              <Link
                to="/peer-review"
                className="text-sm text-primary underline-offset-2 hover:underline"
              >
                Back to Peer Review
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Rubric */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evaluation Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <RubricScorer criteria={DEFAULT_CRITERIA} onChange={setScores} />
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback (optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-y"
                  placeholder="Write constructive feedback for the submitter..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  aria-label="Feedback"
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={fetching}
              >
                {fetching ? 'Submitting…' : 'Submit Review'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
