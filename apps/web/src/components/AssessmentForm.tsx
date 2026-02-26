/**
 * AssessmentForm — F-030: 360° Multi-Rater Assessments
 * Rater submits feedback on all rubric criteria using star ratings (1-5).
 */
import React, { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Star } from 'lucide-react';
import { SUBMIT_RESPONSE_MUTATION } from '@/lib/graphql/assessment.queries';

interface Criteria {
  id: string;
  label: string;
}

interface Props {
  campaignId: string;
  raterRole: 'SELF' | 'PEER' | 'MANAGER' | 'DIRECT_REPORT';
  criteria: Criteria[];
  onSubmitted?: () => void;
}

interface StarRatingProps {
  criteriaId: string;
  label: string;
  value: number;
  onChange: (id: string, score: number) => void;
}

function StarRating({ criteriaId, label, value, onChange }: StarRatingProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className="cursor-pointer">
            <input
              type="radio"
              name={criteriaId}
              value={score}
              checked={value === score}
              onChange={() => onChange(criteriaId, score)}
              className="sr-only"
              aria-label={`${score} star${score !== 1 ? 's' : ''}`}
            />
            <Star
              className={`h-6 w-6 transition-colors ${
                value >= score
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground'
              }`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function AssessmentForm({
  campaignId,
  raterRole,
  criteria,
  onSubmitted,
}: Props) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [narrative, setNarrative] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [{ fetching, error }, submit] = useMutation(SUBMIT_RESPONSE_MUTATION);

  function handleScoreChange(id: string, score: number) {
    setScores((prev) => ({ ...prev, [id]: score }));
  }

  const allRated = criteria.every((c) => scores[c.id] !== undefined);

  async function handleSubmit() {
    if (!allRated) return;
    // Build JSON array with criteriaId and label for aggregator
    const scoreArray = criteria.map((c) => ({
      criteriaId: c.id,
      label: c.label,
      score: scores[c.id]!,
    }));
    const res = await submit({
      campaignId,
      raterRole,
      criteriaScores: JSON.stringify(scoreArray),
      narrative: narrative.trim() || undefined,
    });
    if (!res.error) {
      setSubmitted(true);
      onSubmitted?.();
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-green-600 font-medium">
            Your feedback has been submitted. Thank you!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Your Feedback</CardTitle>
        <p className="text-sm text-muted-foreground">
          Role: {raterRole.replace('_', ' ')}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {criteria.map((c) => (
          <StarRating
            key={c.id}
            criteriaId={c.id}
            label={c.label}
            value={scores[c.id] ?? 0}
            onChange={handleScoreChange}
          />
        ))}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Additional Comments (optional)
          </label>
          <Textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Share any additional observations..."
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        <Button
          onClick={() => void handleSubmit()}
          disabled={fetching || !allRated}
          className="w-full"
        >
          {fetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
}
