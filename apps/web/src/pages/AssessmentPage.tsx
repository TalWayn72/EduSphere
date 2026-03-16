/**
 * AssessmentPage — renders AssessmentForm with proctoring enabled.
 * Route: /assessment/:assessmentId
 */
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { AssessmentForm } from '@/components/AssessmentForm';

const DEMO_CRITERIA = [
  { id: 'c1', label: 'Communication' },
  { id: 'c2', label: 'Teamwork' },
  { id: 'c3', label: 'Problem Solving' },
];

export function AssessmentPage() {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();

  return (
    <Layout>
      <PageShell size="md">
        <PageHeader
          title="Assessment"
          breadcrumbs={[
            { label: 'Assessments', href: '/assessments' },
            { label: 'Assessment' },
          ]}
        />
        <AssessmentForm
          campaignId={assessmentId}
          raterRole="PEER"
          criteria={DEMO_CRITERIA}
          proctoringEnabled={true}
          assessmentId={assessmentId}
        />
      </PageShell>
    </Layout>
  );
}
