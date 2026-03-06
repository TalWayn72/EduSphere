/**
 * InstructorMergeQueuePage — Instructor queue for reviewing student annotation
 * proposals (PRD §4.3 — Annotation Merge Request, "Propose to Official").
 *
 * Shows pending proposals with the annotation content, course context,
 * and diff view (proposed text vs. empty official slot). Instructors can
 * approve (promotes annotation to INSTRUCTOR layer) or reject.
 *
 * In production: GraphQL query `pendingAnnotationProposals` + mutations
 * `approveAnnotationProposal` / `rejectAnnotationProposal`.
 * Here: mock data for demonstration.
 */
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, GitPullRequest, BookOpen } from 'lucide-react';

interface MergeRequest {
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

const MOCK_QUEUE: MergeRequest[] = [
  {
    id: 'mr-1',
    annotationId: 'ann-42',
    content:
      'Maimonides uses the term "overflow" (shefa) to describe the emanation of the Active Intellect onto the human intellect — a key bridge concept between Neoplatonism and Aristotelian cosmology.',
    description:
      'This insight connects the AI-generated summary with the source text in a way that is missing from the official notes.',
    authorName: 'David Ben-Ami',
    courseId: 'course-1',
    courseName: 'Jewish Philosophy 101',
    contentTimestamp: 1245,
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'pending',
  },
  {
    id: 'mr-2',
    annotationId: 'ann-17',
    content:
      'The Kantian categorical imperative parallels the Talmudic principle "do not do to others what you would not want done to you" (Shabbat 31a) — both derive ethics from universalisability.',
    description:
      'Cross-course connection that would benefit students in both Philosophy and Halakha tracks.',
    authorName: 'Miriam Cohen',
    courseId: 'course-2',
    courseName: 'Early Modern Philosophy',
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'pending',
  },
  {
    id: 'mr-3',
    annotationId: 'ann-91',
    content:
      'Compatibilism in Frankfurt cases shows that moral responsibility requires reasons-responsiveness, not libertarian free will.',
    description: 'Useful clarification for the assessment questions on free will.',
    authorName: 'Yonatan Levi',
    courseId: 'course-2',
    courseName: 'Early Modern Philosophy',
    contentTimestamp: 720,
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'pending',
  },
];

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function InstructorMergeQueuePage() {
  const [requests, setRequests] = useState<MergeRequest[]>(MOCK_QUEUE);

  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
    );
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl font-bold">Annotation Proposals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Review student proposals to promote personal annotations to official
            course content.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {pending.length} pending
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {requests.filter((r) => r.status === 'approved').length} approved
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            {requests.filter((r) => r.status === 'rejected').length} rejected
          </span>
        </div>

        {/* Pending queue */}
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No pending proposals.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4" data-testid="merge-queue-list">
            {pending.map((req) => (
              <Card key={req.id} data-testid={`merge-request-${req.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {req.authorName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        {req.courseName}
                        {req.contentTimestamp !== undefined && (
                          <span className="font-mono bg-muted px-1 rounded">
                            {formatTimestamp(req.contentTimestamp)}
                          </span>
                        )}
                        <span>{timeAgo(req.submittedAt)}</span>
                      </div>
                    </div>
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Diff view: proposed content */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Proposed annotation:
                    </p>
                    <div
                      className="bg-green-50 border border-green-200 rounded-md p-3 text-sm"
                      data-testid={`proposal-content-${req.id}`}
                    >
                      <span className="text-green-700 font-mono text-xs mr-1">
                        +
                      </span>
                      {req.content}
                    </div>
                  </div>

                  {/* Proposal justification */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Reason:
                    </p>
                    <p className="text-sm text-muted-foreground italic">
                      "{req.description}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-8 gap-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(req.id)}
                      data-testid={`approve-btn-${req.id}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => handleReject(req.id)}
                      data-testid={`reject-btn-${req.id}`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resolved items */}
        {resolved.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resolved
            </p>
            {resolved.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 p-3 rounded-md border bg-muted/30 text-sm"
                data-testid={`resolved-${req.id}`}
              >
                {req.status === 'approved' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs">{req.authorName}</p>
                  <p className="text-muted-foreground text-xs truncate">
                    {req.content}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    req.status === 'approved'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
