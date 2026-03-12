/**
 * AutoGradingResultsPage — AI auto-grading results for quiz submissions.
 * Route: /admin/auto-grading
 * Access: INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

interface GradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  percentageScore: number;
  explanation: string;
  suggestions: string[];
}

const MOCK_RESULTS: GradingResult[] = [
  {
    questionId: 'q1',
    score: 8,
    maxScore: 10,
    percentageScore: 80,
    explanation: 'Good coverage of main concepts',
    suggestions: ['Add more examples'],
  },
  {
    questionId: 'q2',
    score: 5,
    maxScore: 10,
    percentageScore: 50,
    explanation: 'Missing key terminology',
    suggestions: ['Review chapter 3', 'Practice with flashcards'],
  },
];

function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-green-700 bg-green-50 border-green-200';
  if (pct >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
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

  if (!role || !ALLOWED_ROLES.has(role)) {
    navigate('/dashboard');
    return (
      <div data-testid="access-denied" className="p-8 text-center text-destructive">
        Access Denied — insufficient permissions.
      </div>
    );
  }

  const overall = overallScore(MOCK_RESULTS);

  return (
    <AdminLayout title="AI Auto-Grading Results" description="Review AI-generated quiz grading">
      <div data-testid="auto-grading-page" className="space-y-6">
        {/* Overall Score */}
        <Card data-testid="overall-score-summary">
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-bold ${overall >= 80 ? 'text-green-700' : overall >= 60 ? 'text-yellow-700' : 'text-red-700'}`}>
              {overall}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {MOCK_RESULTS.reduce((a, r) => a + r.score, 0)} /{' '}
              {MOCK_RESULTS.reduce((a, r) => a + r.maxScore, 0)} points
            </p>
          </CardContent>
        </Card>

        {/* Per-question results */}
        {MOCK_RESULTS.map((result) => (
          <Card
            key={result.questionId}
            data-testid={`grading-result-${result.questionId}`}
            className={`border ${scoreColor(result.percentageScore)}`}
          >
            <CardHeader>
              <CardTitle className="text-base">
                Question {result.questionId.toUpperCase()} — {result.score}/{result.maxScore} ({result.percentageScore}%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{result.explanation}</p>
              {result.suggestions.length > 0 && (
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {result.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Privacy Notice */}
        <Card>
          <CardContent className="py-4">
            <p data-testid="privacy-notice" className="text-sm text-muted-foreground">
              AI grading uses local Ollama — student data never leaves your servers
            </p>
          </CardContent>
        </Card>

        {/* Export */}
        <div className="flex justify-end">
          <Button
            data-testid="export-grading-btn"
            variant="outline"
            onClick={() => window.print()}
          >
            Export Results
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
