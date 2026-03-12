/**
 * AssessmentResultsDetailPage — Phase 60 (360° Multi-Rater Assessments).
 * Route: /assessments/:id/results-detail
 *
 * Displays multi-rater assessment results with:
 * - Radar chart (recharts) for rubric criteria scores
 * - Breakdown table: self / peer / manager scores side-by-side
 * - Anonymized by default (rater names hidden unless ORG_ADMIN)
 *
 * Memory safety: mounted guard on useQuery.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

const ASSESSMENT_RESULTS_QUERY = `
  query AssessmentResults($id: ID!) {
    assessmentCampaign(id: $id) {
      id
      title
      status
      rubricCriteria { id name weight maxScore }
      raterGroups {
        raterType
        scores { criterionId score }
      }
    }
  }
`;

interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
}

interface RaterGroup {
  raterType: string;
  scores: { criterionId: string; score: number }[];
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  rubricCriteria: RubricCriterion[];
  raterGroups: RaterGroup[];
}

function buildRadarData(
  criteria: RubricCriterion[],
  groups: RaterGroup[]
): Record<string, string | number>[] {
  return criteria.map((c) => {
    const entry: Record<string, string | number> = { criterion: c.name };
    groups.forEach((g) => {
      const s = g.scores.find((sc) => sc.criterionId === c.id);
      if (s) entry[g.raterType] = +(s.score.toFixed(1));
    });
    return entry;
  });
}

const RATER_COLORS: Record<string, string> = {
  SELF: '#6366f1',
  PEER: '#10b981',
  MANAGER: '#f59e0b',
  INSTRUCTOR: '#3b82f6',
};

export default function AssessmentResultsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [result] = useQuery<{ assessmentCampaign: Campaign }>({
    query: ASSESSMENT_RESULTS_QUERY,
    variables: { id },
    pause: !mounted || !id,
  });

  if (!mounted || result.fetching) {
    return (
      <div className="p-6 space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (result.error || !result.data?.assessmentCampaign) {
    return (
      <div className="p-6" role="alert">
        <p className="text-sm text-red-600">Unable to load assessment results.</p>
      </div>
    );
  }

  const campaign = result.data.assessmentCampaign;
  const radarData = buildRadarData(campaign.rubricCriteria, campaign.raterGroups);
  const raterTypes = campaign.raterGroups.map((g) => g.raterType);

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8" aria-label="Assessment Results">
      <header>
        <h1 className="text-2xl font-bold">{campaign.title}</h1>
        <Badge variant="secondary" className="mt-1">
          {campaign.status}
        </Badge>
      </header>

      <section aria-label="Radar chart">
        <h2 className="text-lg font-semibold mb-4">Score Overview</h2>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="criterion" />
            {raterTypes.map((rt) => (
              <Radar
                key={rt}
                name={rt}
                dataKey={rt}
                stroke={RATER_COLORS[rt] ?? '#888'}
                fill={RATER_COLORS[rt] ?? '#888'}
                fillOpacity={0.15}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </section>

      <section aria-label="Scores by rater type">
        <h2 className="text-lg font-semibold mb-4">Breakdown by Rater</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 font-medium">Criterion</th>
                {raterTypes.map((rt) => (
                  <th key={rt} className="text-center p-3 font-medium">
                    {rt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaign.rubricCriteria.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="p-3 font-medium">{c.name}</td>
                  {raterTypes.map((rt) => {
                    const grp = campaign.raterGroups.find((g) => g.raterType === rt);
                    const sc = grp?.scores.find((s) => s.criterionId === c.id);
                    return (
                      <td key={rt} className="text-center p-3">
                        {sc ? sc.score.toFixed(1) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export { AssessmentResultsDetailPage };
