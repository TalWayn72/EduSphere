/**
 * AssessmentPage — renders AssessmentForm with proctoring enabled.
 * Route: /assessment/:assessmentId
 */
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
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
      <div className="max-w-2xl mx-auto mt-6">
        <AssessmentForm
          campaignId={assessmentId}
          raterRole="PEER"
          criteria={DEMO_CRITERIA}
          proctoringEnabled={true}
          assessmentId={assessmentId}
        />
      </div>
    </Layout>
  );
}
