/**
 * AssessmentResultReport — F-030: 360° Multi-Rater Assessments
 * Displays aggregated 360° results per criterion with horizontal score bars.
 */
import React from 'react';
import { useQuery } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ASSESSMENT_RESULT_QUERY } from '@/lib/graphql/assessment.queries';

interface CriteriaAggregation {
  criteriaId: string;
  label: string;
  selfScore: number | null;
  peerAvg: number | null;
  managerScore: number | null;
  overallAvg: number;
}

interface AssessmentResult {
  campaignId: string;
  summary: string;
  generatedAt: string;
  aggregatedScores: CriteriaAggregation[];
}

interface Props {
  campaignId: string;
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;
  const pct = Math.round((score / 5) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-muted-foreground shrink-0">{label}</span>
      <Progress value={pct} className="flex-1 h-2" />
      <span className="w-8 text-right font-medium">{score.toFixed(1)}</span>
    </div>
  );
}

function CriteriaCard({ criteria }: { criteria: CriteriaAggregation }) {
  const overallPct = Math.round((criteria.overallAvg / 5) * 100);
  return (
    <div className="space-y-2 p-3 border rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{criteria.label}</span>
        <Badge variant="secondary">{criteria.overallAvg.toFixed(1)}/5</Badge>
      </div>
      <Progress value={overallPct} className="h-3" />
      <div className="space-y-1 pt-1">
        <ScoreBar label="Self" score={criteria.selfScore} />
        <ScoreBar label="Peer avg" score={criteria.peerAvg} />
        <ScoreBar label="Manager" score={criteria.managerScore} />
      </div>
    </div>
  );
}

export function AssessmentResultReport({ campaignId }: Props) {
  const [{ data, fetching, error }] = useQuery({
    query: ASSESSMENT_RESULT_QUERY,
    variables: { campaignId },
  });

  if (fetching) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading results...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const result: AssessmentResult | null = data?.assessmentResult ?? null;

  if (!result) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No results available yet. Complete the campaign to generate results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>360° Assessment Results</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generated: {new Date(result.generatedAt).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/40 rounded-lg">
          <p className="text-sm font-medium text-foreground">
            {result.summary}
          </p>
        </div>
        <div className="space-y-3">
          {result.aggregatedScores.map((c) => (
            <CriteriaCard key={c.criteriaId} criteria={c} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
