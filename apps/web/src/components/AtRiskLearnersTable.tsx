/**
 * AtRiskLearnersTable.tsx - Displays at-risk learners for instructors.
 * Used by CourseAnalyticsPage. F-003 Performance Risk Detection.
 */
import { Button } from '@/components/ui/button';

export interface RiskFactorItem {
  key: string;
  description: string;
}

export interface AtRiskLearnerRow {
  learnerId: string;
  courseId: string;
  riskScore: number;
  riskFactors: RiskFactorItem[];
  flaggedAt: string;
  daysSinceLastActivity: number;
  progressPercent: number;
}

interface Props {
  learners: AtRiskLearnerRow[];
  onResolve: (learnerId: string, courseId: string) => void;
  resolving?: string | null;
}

function riskBadgeClass(score: number): string {
  if (score > 0.7)
    return 'px-2 py-0.5 rounded border text-xs font-semibold bg-red-100 text-red-800 border-red-200';
  if (score >= 0.5)
    return 'px-2 py-0.5 rounded border text-xs font-semibold bg-orange-100 text-orange-800 border-orange-200';
  return 'px-2 py-0.5 rounded border text-xs font-semibold bg-yellow-100 text-yellow-800 border-yellow-200';
}

export function AtRiskLearnersTable({ learners, onResolve, resolving }: Props) {
  if (learners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No at-risk learners detected.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-left">
            <th className="pb-2 pr-4">Learner ID</th>
            <th className="pb-2 pr-4">Risk Score</th>
            <th className="pb-2 pr-4">Days Inactive</th>
            <th className="pb-2 pr-4">Progress</th>
            <th className="pb-2 pr-4">Risk Factors</th>
            <th className="pb-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l) => (
            <tr
              key={l.learnerId + l.courseId}
              className="border-b hover:bg-muted/50"
            >
              <td className="py-2 pr-4 font-mono text-xs">
                {l.learnerId.slice(0, 8)}...
              </td>
              <td className="py-2 pr-4">
                <span className={riskBadgeClass(l.riskScore)}>
                  {(l.riskScore * 100).toFixed(0)}%
                </span>
              </td>
              <td className="py-2 pr-4">{l.daysSinceLastActivity}d</td>
              <td className="py-2 pr-4">{l.progressPercent.toFixed(1)}%</td>
              <td className="py-2 pr-4 max-w-xs">
                <ul className="space-y-0.5">
                  {l.riskFactors.map((f) => (
                    <li key={f.key} className="text-xs text-muted-foreground">
                      {f.description}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="py-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolving === l.learnerId + l.courseId}
                  onClick={() => onResolve(l.learnerId, l.courseId)}
                >
                  Resolve
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
