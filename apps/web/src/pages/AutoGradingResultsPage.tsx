/**
 * AutoGradingResultsPage — AI auto-grading results for quiz submissions.
 * Route: /admin/auto-grading
 * Access: INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthRole } from '@/hooks/useAuthRole';

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

const AUTO_GRADING_RESULTS_QUERY = `
  query AutoGradingResults($submissionId: ID!) {
    autoGradingResults(submissionId: $submissionId) {
      questionId
      score
      maxScore
      explanation
      suggestions
    }
  }
`;

interface GradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  explanation: string;
  suggestions: string[];
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-green-700 bg-green-50 border-green-200';
  if (pct >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function scoreLabel(pct: number): { icon: string; text: string } {
  if (pct >= 80) return { icon: '\u2713', text: 'Pass' };
  if (pct >= 60) return { icon: '\u26A0', text: 'Partial' };
  return { icon: '\u2717', text: 'Fail' };
}

function overallScore(results: GradingResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((acc, r) => acc + r.score, 0);
  const max = results.reduce((acc, r) => acc + r.maxScore, 0);
  return max > 0 ? Math.round((total / max) * 100) : 0;
}

export function AutoGradingResultsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submissionId') ?? '';

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [result] = useQuery<{ autoGradingResults: GradingResult[] }>({
    query: AUTO_GRADING_RESULTS_QUERY,
    variables: { submissionId },
    pause: !mounted || !submissionId,
  });

  if (!role || !ALLOWED_ROLES.has(role)) {
    navigate('/dashboard');
    return (
      <div data-testid="access-denied" className="p-8 text-center text-destructive">
        Access Denied — insufficient permissions.
      </div>
    );
  }

  const { data, fetching, error } = result;
  const results = data?.autoGradingResults ?? [];
  const overall = overallScore(results);

  return (
    <AdminLayout title="AI Auto-Grading Results" description="Review AI-generated quiz grading">
      <div data-testid="auto-grading-page" className="space-y-6">
        {fetching && (
          <div className="space-y-4" data-testid="grading-skeleton">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        )}

        {error && !fetching && (
          <Card>
            <CardContent className="py-8 text-center text-destructive text-sm">
              Failed to load grading results. Please try again later.
            </CardContent>
          </Card>
        )}

        {!fetching && !error && results.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm" data-testid="empty-state">No grading results yet.</p>
            </CardContent>
          </Card>
        )}

        {!fetching && results.length > 0 && (
          <>
            <Card data-testid="overall-score-summary">
              <CardHeader><CardTitle>Overall Score</CardTitle></CardHeader>
              <CardContent>
                <div aria-live="polite" aria-atomic="true">
                  <p className={`text-4xl font-bold ${overall >= 80 ? 'text-green-700' : overall >= 60 ? 'text-yellow-700' : 'text-red-700'}`}>
                    <span aria-hidden="true">{scoreLabel(overall).icon} </span>
                    {overall}%
                    <span className="ml-2 text-lg font-semibold">{scoreLabel(overall).text}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {results.reduce((a, r) => a + r.score, 0)} / {results.reduce((a, r) => a + r.maxScore, 0)} points
                  </p>
                </div>
              </CardContent>
            </Card>

            {results.map((r) => {
              const pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
              const label = scoreLabel(pct);
              return (
                <Card key={r.questionId} data-testid={`grading-result-${r.questionId}`} className={`border ${scoreColor(pct)}`}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <span aria-hidden="true">{label.icon} </span>
                      Question {r.questionId.toUpperCase()} — {r.score}/{r.maxScore} ({pct}%)
                      <span className="ml-2 text-sm font-medium">({label.text})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{r.explanation}</p>
                    {r.suggestions.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {r.suggestions.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardContent className="py-4">
                <p data-testid="privacy-notice" className="text-sm text-muted-foreground">
                  AI grading uses local Ollama — student data never leaves your servers
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button data-testid="export-grading-btn" variant="outline" onClick={() => window.print()}>
                Export Results
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
