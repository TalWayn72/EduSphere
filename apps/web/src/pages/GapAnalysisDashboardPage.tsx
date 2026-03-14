/**
 * GapAnalysisDashboardPage — Knowledge gap analysis for ORG_ADMIN / SUPER_ADMIN.
 * Route: /admin/gap-analysis
 * Wired to skillGapAnalysis + skillProfiles queries from subgraph-knowledge.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthRole } from '@/hooks/useAuthRole';
import { SKILL_GAP_ANALYSIS_QUERY, SKILL_PROFILES_QUERY } from '@/lib/graphql/knowledge-tier3.queries';
import { GapAnalysisTable } from '@/components/gap-analysis/GapAnalysisTable';

const ALLOWED_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

interface SkillProfile {
  id: string;
  roleName: string;
  description: string | null;
  requiredConceptsCount: number;
}

interface SkillGapReport {
  roleId: string;
  roleName: string;
  totalRequired: number;
  mastered: number;
  gapCount: number;
  completionPercentage: number;
  gaps: Array<{
    conceptName: string;
    isMastered: boolean;
    recommendedContentItems: string[];
    recommendedContentTitles: string[];
    relevanceScore: number;
  }>;
}

export function GapAnalysisDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [mounted, setMounted] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  useEffect(() => { setMounted(true); }, []);

  const [profilesResult] = useQuery<{ skillProfiles: SkillProfile[] }>({
    query: SKILL_PROFILES_QUERY,
    pause: !mounted,
  });

  const [gapResult] = useQuery<{ skillGapAnalysis: SkillGapReport }>({
    query: SKILL_GAP_ANALYSIS_QUERY,
    variables: { roleId: selectedRoleId },
    pause: !mounted || !selectedRoleId,
  });

  // Auto-select first profile when loaded
  useEffect(() => {
    const profiles = profilesResult.data?.skillProfiles;
    if (profiles && profiles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(profiles[0]?.id ?? '');
    }
  }, [profilesResult.data, selectedRoleId]);

  if (!role || !ALLOWED_ROLES.has(role)) {
    navigate('/dashboard');
    return (
      <div data-testid="access-denied" className="p-8 text-center text-destructive">
        Access Denied — insufficient permissions.
      </div>
    );
  }

  const { fetching: profilesFetching, error: profilesError } = profilesResult;
  const profiles = profilesResult.data?.skillProfiles ?? [];
  const report = gapResult.data?.skillGapAnalysis;
  const gapFetching = gapResult.fetching;
  const gapError = gapResult.error;
  const isLoading = profilesFetching || gapFetching;

  return (
    <AdminLayout title="Gap Analysis Dashboard" description="Knowledge gaps across your organisation">
      <div data-testid="gap-analysis-page" className="space-y-6">
        {isLoading && (
          <div className="space-y-4" data-testid="gap-skeleton">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        )}

        {(profilesError || gapError) && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              Failed to load gap analysis data. Please try again later.
            </CardContent>
          </Card>
        )}

        {!isLoading && !profilesError && profiles.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm" data-testid="empty-state">
                No skill profiles found. Create a skill profile to begin gap analysis.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && profiles.length > 0 && report && (
          <>
            <Card data-testid="gap-summary-card">
              <CardHeader><CardTitle>Skill Gap Summary</CardTitle></CardHeader>
              <CardContent className="flex gap-8">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {Math.round(report.completionPercentage)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Completion</p>
                </div>
                <div>
                  <p data-testid="total-gaps-count" className="text-3xl font-bold text-destructive">
                    {report.gapCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Active gaps</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{report.mastered}/{report.totalRequired}</p>
                  <p className="text-sm text-muted-foreground">Mastered</p>
                </div>
              </CardContent>
            </Card>

            <GapAnalysisTable gaps={report.gaps} />

            <div className="flex justify-end">
              <Button data-testid="export-gap-report-btn" variant="outline" onClick={() => window.print()}>
                Export Report
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
