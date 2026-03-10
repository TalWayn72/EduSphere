/**
 * AtRiskLearnersPanel — Shows at-risk learners for a given course with
 * risk score, days since active, and risk factor badges.
 * "Send Nudge" is a placeholder button (disabled) — backend not yet wired.
 */
import React from 'react';
import { useQuery } from 'urql';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AT_RISK_LEARNERS_QUERY } from '@/lib/graphql/content-tier3.queries';

interface RiskFactor {
  key: string;
  description: string;
}

interface AtRiskLearner {
  learnerId: string;
  courseId: string;
  riskScore: number;
  daysSinceLastActivity: number;
  progressPercent: number;
  riskFactors: RiskFactor[];
}

interface AtRiskResult {
  atRiskLearners: AtRiskLearner[];
}

interface Props {
  courseId: string;
}

export function AtRiskLearnersPanel({ courseId }: Props) {
  const [{ data, fetching }] = useQuery<AtRiskResult>({
    query: AT_RISK_LEARNERS_QUERY,
    variables: { courseId },
    pause: true, // TODO(Phase-49): resolver not yet in supergraph — wire when available
  });

  if (fetching) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading at-risk learners…</span>
      </div>
    );
  }

  const learners = data?.atRiskLearners ?? [];

  if (!learners.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No at-risk learners — great job!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="At-risk learners">
        <thead>
          <tr className="border-b text-muted-foreground text-left">
            <th className="py-2 pr-4 font-medium">Learner ID</th>
            <th className="py-2 pr-4 font-medium">Risk Score</th>
            <th className="py-2 pr-4 font-medium">Days Since Active</th>
            <th className="py-2 pr-4 font-medium">Progress</th>
            <th className="py-2 pr-4 font-medium">Risk Factors</th>
            <th className="py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l) => (
            <tr key={l.learnerId} className="border-b last:border-0">
              <td className="py-2 pr-4 font-mono text-xs">{l.learnerId.slice(0, 8)}…</td>
              <td className="py-2 pr-4">
                <span
                  className={
                    l.riskScore >= 70
                      ? 'text-destructive font-semibold'
                      : l.riskScore >= 40
                      ? 'text-amber-600 font-semibold'
                      : 'text-emerald-600'
                  }
                >
                  {l.riskScore}
                </span>
              </td>
              <td className="py-2 pr-4">{l.daysSinceLastActivity}d</td>
              <td className="py-2 pr-4">{l.progressPercent}%</td>
              <td className="py-2 pr-4">
                <div className="flex flex-wrap gap-1">
                  {l.riskFactors.map((f) => (
                    <span
                      key={f.key}
                      title={f.description}
                      className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs"
                    >
                      {f.key}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-2">
                <Button size="sm" variant="outline" disabled>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Send Nudge
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
