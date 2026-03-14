/**
 * InstructorMergeQueuePage — Instructor queue for reviewing student annotation
 * proposals (PRD §4.3 — Annotation Merge Request, "Propose to Official").
 *
 * Wired to GraphQL: pendingAnnotationProposals query +
 * approveAnnotationProposal / rejectAnnotationProposal mutations.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GitPullRequest } from 'lucide-react';
import { MergeRequestCard } from '@/components/merge-queue/MergeRequestCard';
import { RejectDialog } from '@/components/merge-queue/RejectDialog';
import { StatsBar, ResolvedList } from '@/components/merge-queue/MergeQueueStats';

const PENDING_PROPOSALS_QUERY = `
  query PendingAnnotationProposals($courseId: ID!) {
    pendingAnnotationProposals(courseId: $courseId) {
      id annotationId content description authorName
      courseId courseName contentTimestamp submittedAt status
    }
  }
`;

const APPROVE_MUTATION = `
  mutation ApproveAnnotationProposal($proposalId: ID!) {
    approveAnnotationProposal(proposalId: $proposalId) { id status }
  }
`;

const REJECT_MUTATION = `
  mutation RejectAnnotationProposal($proposalId: ID!, $reason: String) {
    rejectAnnotationProposal(proposalId: $proposalId, reason: $reason) { id status }
  }
`;

export interface MergeRequest {
  id: string;
  annotationId: string;
  content: string;
  description: string;
  authorName: string;
  courseId: string;
  courseName: string;
  contentTimestamp?: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function InstructorMergeQueuePage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') ?? '';
  const [mounted, setMounted] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const [result, reexecute] = useQuery<{ pendingAnnotationProposals: MergeRequest[] }>({
    query: PENDING_PROPOSALS_QUERY,
    variables: { courseId },
    pause: !mounted || !courseId,
  });

  const [, approveProposal] = useMutation(APPROVE_MUTATION);
  const [, rejectProposal] = useMutation(REJECT_MUTATION);

  const { data, fetching, error } = result;
  const requests = data?.pendingAnnotationProposals ?? [];
  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

  const handleApprove = async (id: string) => {
    await approveProposal({ proposalId: id });
    reexecute({ requestPolicy: 'network-only' });
  };

  const handleReject = async (id: string, reason: string) => {
    await rejectProposal({ proposalId: id, reason });
    setRejectTarget(null);
    reexecute({ requestPolicy: 'network-only' });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl font-bold">Annotation Proposals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Review student proposals to promote personal annotations to official course content.
          </p>
        </div>

        {fetching && (
          <div className="space-y-4" data-testid="merge-skeleton">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              Failed to load proposals. Please try again later.
            </CardContent>
          </Card>
        )}

        {!fetching && !error && (
          <>
            <StatsBar requests={requests} />

            {pending.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm" data-testid="empty-state">No pending proposals.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4" data-testid="merge-queue-list">
                {pending.map((req) => (
                  <MergeRequestCard
                    key={req.id}
                    request={req}
                    onApprove={() => void handleApprove(req.id)}
                    onReject={() => setRejectTarget(req.id)}
                  />
                ))}
              </div>
            )}

            <ResolvedList resolved={resolved} />
          </>
        )}

        <RejectDialog
          open={rejectTarget !== null}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => rejectTarget && void handleReject(rejectTarget, reason)}
        />
      </div>
    </Layout>
  );
}
