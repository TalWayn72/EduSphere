/**
 * AssessmentResultPage — display aggregated results for a 360° campaign.
 * Route: /assessments/:id/results
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AssessmentRadarChart } from '@/components/assessment/RadarChart';
import { ASSESSMENT_RESULT_QUERY } from '@/lib/graphql/assessment.queries';

interface AggregatedScore {
  criteriaId: string;
  label: string;
  selfScore: number;
  peerAvg: number;
  managerScore: number;
  overallAvg: number;
}

interface AssessmentResult {
  campaignId: string;
  aggregatedScores: AggregatedScore[];
  summary: string;
  generatedAt: string;
}

interface AssessmentResultData {
  assessmentResult: AssessmentResult | null;
}

export function AssessmentResultPage() {
  const { t } = useTranslation('admin');
  const { id: campaignId } = useParams<{ id: string }>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<AssessmentResultData>({
    query: ASSESSMENT_RESULT_QUERY,
    variables: { campaignId },
    pause: !mounted,
  });

  const result = data?.assessmentResult;

  // Build radar chart criteria from aggregated scores, or use sample data when no results
  const radarCriteria = result?.aggregatedScores?.length
    ? result.aggregatedScores.map((s) => ({
        name: s.label,
        score: s.overallAvg,
        maxScore: 5,
      }))
    : [];

  if (!mounted || fetching) {
    return (
      <Layout>
        <div className="container mx-auto p-6 space-y-6 max-w-3xl">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 max-w-3xl">
        <Breadcrumbs
          items={[
            {
              label: t('assessmentResponse.breadcrumbAssessments'),
              href: '/assessments',
            },
            {
              label: t('assessmentResponse.breadcrumbAssessment'),
              href: `/assessments/${campaignId}`,
            },
            { label: t('assessmentResult.breadcrumbResults') },
          ]}
        />
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold">
            {t('assessmentResult.pageTitle')}
          </h1>
        </div>

        {!result ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('assessmentResult.noResults')}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Radar chart */}
            {radarCriteria.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('assessmentResult.scoreOverview')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AssessmentRadarChart
                    criteria={radarCriteria}
                    ariaLabel={t('assessmentResult.radarAriaLabel')}
                  />
                </CardContent>
              </Card>
            )}

            {/* Score table */}
            {result.aggregatedScores.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('assessmentResult.detailedScores')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table
                    className="w-full text-sm"
                    aria-label={t('assessmentResult.tableAriaLabel')}
                  >
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-4">
                          {t('assessmentResult.criterionHeader')}
                        </th>
                        <th className="p-4 text-right">
                          {t('assessmentResult.selfHeader')}
                        </th>
                        <th className="p-4 text-right">
                          {t('assessmentResult.peersHeader')}
                        </th>
                        <th className="p-4 text-right">
                          {t('assessmentResult.managerHeader')}
                        </th>
                        <th className="p-4 text-right font-semibold text-foreground">
                          {t('assessmentResult.overallHeader')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.aggregatedScores.map((s) => (
                        <tr
                          key={s.criteriaId}
                          className="border-b last:border-0"
                        >
                          <td className="p-4 font-medium">{s.label}</td>
                          <td className="p-4 text-right">
                            {s.selfScore.toFixed(1)}
                          </td>
                          <td className="p-4 text-right">
                            {s.peerAvg.toFixed(1)}
                          </td>
                          <td className="p-4 text-right">
                            {s.managerScore.toFixed(1)}
                          </td>
                          <td className="p-4 text-right font-semibold text-primary">
                            {s.overallAvg.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            {result.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('assessmentResult.aiSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {t('assessmentResult.generated')}{' '}
                    {new Date(result.generatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

export default AssessmentResultPage;
