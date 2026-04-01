/**
 * ExamBlueprintListPage — card grid showing exam blueprints for a course.
 * Route: /courses/:courseId/exams/blueprints
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useExamBlueprints } from '@/hooks/useExamApi';
import type { ExamBlueprint } from '@/types/exam-entities';
import type { BlueprintStatus, PassingMethod } from '@/types/exam';

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

const STATUS_STYLES: Record<BlueprintStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-slate-100 text-slate-500',
};

const METHOD_LABELS: Record<PassingMethod, string> = {
  PERCENTAGE: 'Percentage',
  SCALED_SCORE: 'Scaled Score',
  IRT_THETA: 'IRT Theta',
};

export function ExamBlueprintListPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { blueprints, fetching } = useExamBlueprints(courseId ?? '');

  if (mounted && role && !ALLOWED_ROLES.has(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <PageShell size="full">
        <PageHeader title="Exam Blueprints" />
        <div className="container mx-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {blueprints.length} blueprint(s)
            </p>
            <Button
              size="sm"
              onClick={() =>
                void navigate(`/courses/${courseId}/exams/blueprints/new`)
              }
              data-testid="create-blueprint-btn"
            >
              Create Blueprint
            </Button>
          </div>

          {fetching && (
            <p className="text-sm text-muted-foreground">
              Loading blueprints...
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {blueprints.map((bp) => (
              <BlueprintCard
                key={bp.id}
                blueprint={bp}
                onClick={() =>
                  void navigate(
                    `/courses/${courseId}/exams/blueprints/${bp.id}`
                  )
                }
              />
            ))}
          </div>

          {!fetching && blueprints.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No blueprints yet. Create one to define your exam structure.
              </CardContent>
            </Card>
          )}
        </div>
      </PageShell>
    </Layout>
  );
}

// ── Blueprint card sub-component ─────────────────────────────────────────────

function BlueprintCard({
  blueprint,
  onClick,
}: {
  blueprint: ExamBlueprint;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-testid={`blueprint-card-${blueprint.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{blueprint.title}</CardTitle>
          <Badge className={STATUS_STYLES[blueprint.status]}>
            {blueprint.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Questions</span>
          <span className="font-medium">{blueprint.totalQuestions}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time Limit</span>
          <span className="font-medium">{blueprint.timeLimitMinutes} min</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Pass Score</span>
          <span className="font-medium">
            {blueprint.passingScore} ({METHOD_LABELS[blueprint.passingMethod]})
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
