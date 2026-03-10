import { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COHORT_INSIGHTS_QUERY } from '@/lib/graphql/cohort-insights.queries';

interface CohortInsight {
  annotationId: string;
  content: string;
  authorCohortLabel: string;
  relevanceScore: number;
}

interface CohortInsightsData {
  cohortInsights: {
    conceptId: string;
    totalPastDiscussions: number;
    insights: CohortInsight[];
  } | null;
}

export interface CohortInsightsWidgetProps {
  conceptId: string;
  courseId: string;
}

export function CohortInsightsWidget({ conceptId, courseId }: CohortInsightsWidgetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<CohortInsightsData>({
    query: COHORT_INSIGHTS_QUERY,
    variables: { conceptId, courseId },
    pause: !mounted || !conceptId || !courseId,
  });

  const insights = data?.cohortInsights?.insights ?? [];
  const total = data?.cohortInsights?.totalPastDiscussions ?? 0;

  if (!mounted || fetching || insights.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span aria-hidden="true">💡</span>
          <span>Past Cohort Insights</span>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {total} discussion{total !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.slice(0, 3).map((insight) => (
          <div
            key={insight.annotationId}
            className="rounded-md bg-white p-2 dark:bg-gray-900"
          >
            <p className="text-sm text-foreground">{insight.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {insight.authorCohortLabel}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
