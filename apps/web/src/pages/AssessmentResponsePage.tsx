/**
 * AssessmentResponsePage — submit a 360° assessment response.
 * Route: /assessments/:id/respond
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ClipboardList } from 'lucide-react';
import { SUBMIT_RESPONSE_MUTATION } from '@/lib/graphql/assessment.queries';

type RaterRole = 'SELF' | 'PEER' | 'MANAGER' | 'DIRECT_REPORT';

const RATER_ROLES: RaterRole[] = ['SELF', 'PEER', 'MANAGER', 'DIRECT_REPORT'];

const CRITERIA = [
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'communication', label: 'Communication' },
  { id: 'technical', label: 'Technical' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'initiative', label: 'Initiative' },
];

export function AssessmentResponsePage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [mounted, setMounted] = useState(false);
  const [raterRole, setRaterRole] = useState<RaterRole>('PEER');
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(CRITERIA.map((c) => [c.id, 3]))
  );
  const [narrative, setNarrative] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ fetching }, submitResponse] = useMutation(SUBMIT_RESPONSE_MUTATION);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId) return;

    const criteriaScores = JSON.stringify(scores);
    const result = await submitResponse({
      campaignId,
      raterRole,
      criteriaScores,
      narrative: narrative.trim() || undefined,
    });

    if (!result.error) {
      setSubmitted(true);
    }
  }

  if (!mounted) return null;

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto p-6 max-w-xl">
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <ClipboardList className="h-12 w-12 text-primary mx-auto" aria-hidden="true" />
              <p className="text-lg font-semibold">
                Thank you — your assessment has been submitted.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold">Submit Assessment</h1>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Role selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {RATER_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRaterRole(role)}
                    className={[
                      'px-4 py-2 rounded-md text-sm font-medium border transition-colors',
                      raterRole === role
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/60',
                    ].join(' ')}
                  >
                    {role.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Criteria sliders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criteria Scores (1–5)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CRITERIA.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={`slider-${c.id}`} className="text-sm font-medium">
                      {c.label}
                    </label>
                    <span className="text-sm font-semibold text-primary">
                      {scores[c.id]}
                    </span>
                  </div>
                  <input
                    id={`slider-${c.id}`}
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={scores[c.id]}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [c.id]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-primary"
                    aria-label={`${c.label} score`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Narrative */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Narrative (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Share additional context or feedback…"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                aria-label="Narrative feedback"
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={fetching} className="w-full">
            {fetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            ) : null}
            Submit Assessment
          </Button>
        </form>
      </div>
    </Layout>
  );
}

export default AssessmentResponsePage;
