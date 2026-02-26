/**
 * PlagiarismReportCard — displays plagiarism detection results (F-005)
 *
 * Shows flagged status, highest similarity score, and similar submission list.
 * Instructors/admins see a "Review" link per similar submission.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SimilarSubmission {
  submissionId: string;
  userId: string;
  similarity: number;
  submittedAt: string;
}

interface PlagiarismReport {
  submissionId: string;
  isFlagged: boolean;
  highestSimilarity: number;
  similarSubmissions: SimilarSubmission[];
  checkedAt: string;
}

interface PlagiarismReportCardProps {
  report: PlagiarismReport;
  isInstructor?: boolean;
  onReview?: (submissionId: string) => void;
}

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 85 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded bg-gray-200">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

export function PlagiarismReportCard({
  report,
  isInstructor = false,
  onReview,
}: PlagiarismReportCardProps) {
  const { isFlagged, highestSimilarity, similarSubmissions, checkedAt } =
    report;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Plagiarism Report</CardTitle>
        {isFlagged ? (
          <Badge variant="destructive">Flagged</Badge>
        ) : (
          <Badge variant="secondary">Clear</Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Highest match:</span>
          <SimilarityBar value={highestSimilarity} />
        </div>

        {similarSubmissions.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Similar Submissions
            </p>
            <ul className="space-y-2">
              {similarSubmissions.map((s) => (
                <li
                  key={s.submissionId}
                  className="flex items-center justify-between rounded border bg-gray-50 px-3 py-2 text-sm"
                >
                  <div className="space-y-0.5">
                    <SimilarityBar value={s.similarity} />
                    <p className="text-xs text-gray-400">
                      Submitted {new Date(s.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isInstructor && onReview && (
                    <button
                      onClick={() => onReview(s.submissionId)}
                      className="ml-4 text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      Review
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Checked at {new Date(checkedAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
