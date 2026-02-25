/**
 * RoleplayEvaluationReport — F-007 post-session coaching summary.
 *
 * Shows overall score, per-criterion breakdown, strengths and areas for improvement.
 */
import { Button } from '@/components/ui/button';
import { RotateCcw, ArrowLeft, CheckCircle2, TrendingUp } from 'lucide-react';

interface CriterionScore {
  name: string;
  score: number;
  feedback: string;
}

interface Evaluation {
  overallScore: number;
  criteriaScores: CriterionScore[];
  strengths: string[];
  areasForImprovement: string[];
  summary: string;
}

interface Props {
  evaluation: Evaluation;
  scenarioTitle: string;
  onTryAgain: () => void;
  onBack: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="110" height="110" className="-rotate-90">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="#374151" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-gray-400 text-xs block">/ 100</span>
      </div>
    </div>
  );
}

export function RoleplayEvaluationReport({ evaluation, scenarioTitle, onTryAgain, onBack }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-white text-2xl font-bold">Session Complete</h2>
          <p className="text-gray-400 text-sm">{scenarioTitle}</p>
        </div>

        {/* Overall score */}
        <div className="flex flex-col items-center gap-3">
          <ScoreRing score={evaluation.overallScore} />
          <p className="text-gray-300 text-sm text-center max-w-sm">{evaluation.summary}</p>
        </div>

        {/* Criteria breakdown */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Criteria Breakdown</h3>
          {evaluation.criteriaScores.map((c) => (
            <div key={c.name} className="bg-gray-900 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{c.name}</span>
                <span className="text-gray-300 text-sm font-bold">{Math.round(c.score)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${c.score}%` }}
                />
              </div>
              <p className="text-gray-400 text-xs">{c.feedback}</p>
            </div>
          ))}
        </div>

        {/* Strengths */}
        {evaluation.strengths.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Strengths
            </h3>
            <ul className="space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for improvement */}
        {evaluation.areasForImprovement.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" /> Areas for Improvement
            </h3>
            <ul className="space-y-1">
              {evaluation.areasForImprovement.map((a, i) => (
                <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">→</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={onTryAgain} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            <RotateCcw className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Button onClick={onBack} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Scenarios
          </Button>
        </div>
      </div>
    </div>
  );
}
