/**
 * CohortInsightsPage — Surface past cohort discussions and insights.
 * Route: /cohort-insights
 * Phase 47: GAP-7 Cross-cohort institutional knowledge
 */
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { CohortInsightsWidget } from '@/components/cohort-insights/CohortInsightsWidget';
import { useTranslation } from 'react-i18next';

export function CohortInsightsPage() {
  const { t } = useTranslation();
  const [conceptId] = useState('general');
  const [courseId] = useState('all');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {t('cohortInsights.title', 'Cohort Insights')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('cohortInsights.subtitle', 'Discover how past cohorts approached the same concepts')}
          </p>
        </div>
        <CohortInsightsWidget conceptId={conceptId} courseId={courseId} />
      </div>
    </Layout>
  );
}
