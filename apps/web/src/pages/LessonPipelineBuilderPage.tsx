/**
 * LessonPipelineBuilderPage — WYSIWYG lesson authoring tool for instructors.
 * Route: /courses/:courseId/pipeline/builder
 * Phase 36: Create a lesson plan with ordered content steps (VIDEO, QUIZ,
 * DISCUSSION, AI_CHAT, SUMMARY), save as draft, and publish.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  MY_COURSE_LESSON_PLANS_QUERY,
  CREATE_LESSON_PLAN_MUTATION,
  ADD_LESSON_STEP_MUTATION,
  PUBLISH_LESSON_PLAN_MUTATION,
} from '@/lib/graphql/lesson-plan.queries';
import { toast } from 'sonner';

type LessonStepType = 'VIDEO' | 'QUIZ' | 'DISCUSSION' | 'AI_CHAT' | 'SUMMARY';

const STEP_TYPE_LABELS: Record<LessonStepType, string> = {
  VIDEO: 'Video',
  QUIZ: 'Quiz',
  DISCUSSION: 'Discussion',
  AI_CHAT: 'AI Chat',
  SUMMARY: 'Summary',
};

const STEP_TYPE_COLORS: Record<LessonStepType, string> = {
  VIDEO: 'bg-blue-100 text-blue-800',
  QUIZ: 'bg-green-100 text-green-800',
  DISCUSSION: 'bg-purple-100 text-purple-800',
  AI_CHAT: 'bg-orange-100 text-orange-800',
  SUMMARY: 'bg-gray-100 text-gray-800',
};

const ALL_STEPS: LessonStepType[] = [
  'VIDEO',
  'QUIZ',
  'DISCUSSION',
  'AI_CHAT',
  'SUMMARY',
];

const INSTRUCTOR_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

interface Step {
  id: string;
  stepType: LessonStepType;
  stepOrder: number;
  config: Record<string, unknown>;
}

interface Plan {
  id: string;
  courseId: string;
  title: string;
  status: string;
  steps: Step[];
  createdAt: string;
}

export function LessonPipelineBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();
  const [planId, setPlanId] = useState<string | null>(null);
  const [localSteps, setLocalSteps] = useState<LessonStepType[]>([]);
  const [title] = useState('New Lesson Plan');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Role guard — redirect non-instructors
  useEffect(() => {
    if (mounted && role && !INSTRUCTOR_ROLES.has(role)) {
      navigate('/courses');
    }
  }, [mounted, role, navigate]);

  const [{ data }] = useQuery({
    query: MY_COURSE_LESSON_PLANS_QUERY,
    variables: { courseId: courseId ?? '' },
    pause: !mounted || !courseId,
  });

  const plans: Plan[] = data?.myCourseLessonPlans ?? [];
  const activePlan = plans.find((p) => p.id === planId) ?? plans[0] ?? null;

  const [{ fetching: creating }, createPlan] = useMutation(
    CREATE_LESSON_PLAN_MUTATION
  );
  const [{ fetching: addingStep }, addStep] = useMutation(
    ADD_LESSON_STEP_MUTATION
  );
  const [{ fetching: publishing }, publishPlan] = useMutation(
    PUBLISH_LESSON_PLAN_MUTATION
  );

  const isBusy = creating || addingStep || publishing;

  async function handleAddStep(stepType: LessonStepType) {
    if (!courseId) return;
    let targetPlanId = planId ?? activePlan?.id ?? null;

    // Create plan on first step if none exists
    if (!targetPlanId) {
      const { data: created, error } = await createPlan({
        input: { courseId, title },
      });
      if (error || !created?.createLessonPlan) {
        toast.error('Failed to create lesson plan');
        return;
      }
      targetPlanId = created.createLessonPlan.id;
      setPlanId(targetPlanId);
    }

    const { error } = await addStep({
      input: { planId: targetPlanId, stepType, config: {} },
    });
    if (error) {
      toast.error('Failed to add step');
      return;
    }
    setLocalSteps((prev) => [...prev, stepType]);
  }

  async function handleSaveDraft() {
    if (!courseId) return;
    if (!planId && localSteps.length === 0) {
      toast.error('Add at least one step before saving');
      return;
    }
    toast.success('Draft saved');
  }

  async function handlePublish() {
    const id = planId ?? activePlan?.id;
    if (!id) {
      toast.error('Create a plan first');
      return;
    }
    const { error } = await publishPlan({ id });
    if (error) {
      toast.error('Failed to publish lesson plan');
      return;
    }
    toast.success('Lesson plan published');
  }

  const displayedSteps =
    activePlan?.steps.map((s) => s.stepType) ?? localSteps;
  const planStatus = activePlan?.status ?? (planId ? 'DRAFT' : null);

  if (mounted && role && !INSTRUCTOR_ROLES.has(role)) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              data-testid="builder-heading"
            >
              Lesson Pipeline Builder
            </h1>
            {courseId && (
              <p className="text-sm text-muted-foreground mt-1">
                Course: {courseId}
              </p>
            )}
          </div>
          {planStatus && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
              {planStatus}
            </span>
          )}
        </div>

        {/* Step Palette */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Add Step
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ALL_STEPS.map((stepType) => (
                <Button
                  key={stepType}
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => handleAddStep(stepType)}
                  data-testid={`add-step-${stepType}`}
                >
                  + {STEP_TYPE_LABELS[stepType]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step List */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Steps ({displayedSteps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayedSteps.length === 0 ? (
              <p
                className="text-sm text-muted-foreground py-4 text-center"
                data-testid="empty-steps"
              >
                No steps yet — click a step type above to begin.
              </p>
            ) : (
              <ol className="space-y-2" data-testid="step-list">
                {displayedSteps.map((stepType, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-white"
                    data-testid={`step-item-${idx}`}
                  >
                    <span className="flex-none w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STEP_TYPE_COLORS[stepType]}`}
                    >
                      {STEP_TYPE_LABELS[stepType]}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3" data-testid="action-buttons">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isBusy}
            data-testid="save-draft-btn"
          >
            {creating ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isBusy || displayedSteps.length === 0}
            data-testid="publish-btn"
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
