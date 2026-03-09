/**
 * SkillGapDashboard — detailed gap analysis for a specific skill path.
 * Route: /skills/gap/:pathId
 * Access: all authenticated users
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle2, Circle, Target } from 'lucide-react';
import { SKILL_GAP_ANALYSIS_QUERY } from '@/lib/graphql/skills.queries';

interface GapSkill {
  id: string;
  name: string;
  category: string;
  level: string;
}

interface SkillGapAnalysis {
  targetPathId: string;
  totalSkills: number;
  masteredSkills: number;
  completionPct: number;
  gapSkills: GapSkill[];
}

interface SkillGapAnalysisResult {
  skillGapAnalysis: SkillGapAnalysis;
}

export function SkillGapDashboard() {
  const { pathId = '' } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery<SkillGapAnalysisResult>({
    query: SKILL_GAP_ANALYSIS_QUERY,
    variables: { pathId },
    pause: !mounted || !pathId,
  });

  const analysis = data?.skillGapAnalysis;
  const isLoading = !mounted || fetching;

  const masteredCount = analysis?.masteredSkills ?? 0;
  const totalCount = analysis?.totalSkills ?? 0;
  const completionPct = analysis?.completionPct ?? 0;
  const gapSkills = analysis?.gapSkills ?? [];
  const masteredSkillsCount = masteredCount;
  const masteredSkillsList = Array.from({ length: masteredSkillsCount }, (_, i) => i);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Back button + heading */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/skills')}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Skill Paths
          </Button>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-xl font-semibold">Skill Gap Analysis</h1>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading gap analysis">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <p className="text-destructive text-sm">
            Failed to load gap analysis. Please try again.
          </p>
        )}

        {/* Content */}
        {!isLoading && analysis && (
          <div className="space-y-6">
            {/* Progress summary */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {masteredCount} of {totalCount} skills mastered
                </p>
                <span className="text-2xl font-bold text-primary">{completionPct}%</span>
              </div>
              <Progress
                value={completionPct}
                className="h-3"
                aria-label={`${completionPct}% of skills mastered`}
              />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mastered skills */}
              <div className="rounded-lg border p-4 space-y-2">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden />
                  Mastered Skills ({masteredCount})
                </h2>
                {masteredSkillsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No skills mastered yet.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {masteredCount} skill{masteredCount !== 1 ? 's' : ''} completed.
                  </p>
                )}
              </div>

              {/* Gap skills */}
              <div className="rounded-lg border p-4 space-y-2">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Skills to Learn ({gapSkills.length})
                </h2>
                {gapSkills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All skills mastered!</p>
                ) : (
                  <ul className="space-y-1.5">
                    {gapSkills.map((skill) => (
                      <li key={skill.id} className="flex items-center gap-2">
                        <Circle className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
                        <span className="text-sm">{skill.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto shrink-0">
                          {skill.category}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex justify-start">
              <Button onClick={() => navigate('/skills')} className="gap-2">
                <Target className="h-4 w-4" aria-hidden />
                Start Learning
              </Button>
            </div>
          </div>
        )}

        {/* No data fallback */}
        {!isLoading && !error && !analysis && (
          <p className="text-muted-foreground">No gap analysis data available for this path.</p>
        )}
      </div>
    </Layout>
  );
}
