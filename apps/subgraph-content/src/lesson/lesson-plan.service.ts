import { Injectable, Logger, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  asc,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

interface PlanRow {
  id: string;
  course_id: string;
  tenant_id: string;
  title: string;
  status: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface StepRow {
  id: string;
  plan_id: string;
  step_type: string;
  step_order: number;
  config: Record<string, unknown>;
  created_at: Date;
}

function mapStep(r: StepRow) {
  return {
    id: r.id,
    stepType: r.step_type,
    stepOrder: r.step_order,
    config: r.config ?? {},
  };
}

function mapPlan(row: PlanRow, steps: StepRow[]) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    status: row.status,
    steps: steps.map(mapStep),
    createdAt: String(row.created_at),
  };
}

@Injectable()
export class LessonPlanService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPlanService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async createPlan(
    courseId: string,
    tenantCtx: TenantContext,
    title: string
  ) {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [row] = await tx
        .insert(schema.course_lesson_plans)
        .values({
          course_id: courseId,
          tenant_id: tenantCtx.tenantId,
          title,
          status: 'DRAFT',
          created_by: tenantCtx.userId,
        })
        .returning();
      this.logger.log(
        `[LessonPlanService] createPlan courseId=${courseId} tenantId=${tenantCtx.tenantId}`
      );
      return mapPlan(row as PlanRow, []);
    });
  }

  async getPlan(id: string, tenantCtx: TenantContext) {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.course_lesson_plans)
        .where(eq(schema.course_lesson_plans.id, id))
        .limit(1);
      if (!row) return null;
      const steps = await tx
        .select()
        .from(schema.course_lesson_steps)
        .where(eq(schema.course_lesson_steps.plan_id, id))
        .orderBy(asc(schema.course_lesson_steps.step_order));
      return mapPlan(row as PlanRow, steps as StepRow[]);
    });
  }

  async getByCoursId(courseId: string, tenantCtx: TenantContext) {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const plans = await tx
        .select()
        .from(schema.course_lesson_plans)
        .where(
          and(
            eq(schema.course_lesson_plans.course_id, courseId),
            eq(schema.course_lesson_plans.tenant_id, tenantCtx.tenantId)
          )
        );
      const result = [];
      for (const plan of plans) {
        const steps = await tx
          .select()
          .from(schema.course_lesson_steps)
          .where(eq(schema.course_lesson_steps.plan_id, plan.id))
          .orderBy(asc(schema.course_lesson_steps.step_order));
        result.push(mapPlan(plan as PlanRow, steps as StepRow[]));
      }
      return result;
    });
  }

  async addStep(
    planId: string,
    tenantCtx: TenantContext,
    stepType: string,
    config: Record<string, unknown>
  ) {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const existing = await tx
        .select({ step_order: schema.course_lesson_steps.step_order })
        .from(schema.course_lesson_steps)
        .where(eq(schema.course_lesson_steps.plan_id, planId))
        .orderBy(asc(schema.course_lesson_steps.step_order));
      const nextOrder = existing.length;
      await tx
        .insert(schema.course_lesson_steps)
        .values({
          plan_id: planId,
          step_type: stepType as
            | 'VIDEO'
            | 'QUIZ'
            | 'DISCUSSION'
            | 'AI_CHAT'
            | 'SUMMARY',
          step_order: nextOrder,
          config,
        });
      const [plan] = await tx
        .select()
        .from(schema.course_lesson_plans)
        .where(eq(schema.course_lesson_plans.id, planId))
        .limit(1);
      if (!plan) throw new NotFoundException('Lesson plan not found');
      const steps = await tx
        .select()
        .from(schema.course_lesson_steps)
        .where(eq(schema.course_lesson_steps.plan_id, planId))
        .orderBy(asc(schema.course_lesson_steps.step_order));
      this.logger.log(
        `[LessonPlanService] addStep planId=${planId} stepType=${stepType}`
      );
      return mapPlan(plan as PlanRow, steps as StepRow[]);
    });
  }

  async reorderSteps(planId: string, tenantCtx: TenantContext, stepIds: string[]) {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      for (let i = 0; i < stepIds.length; i++) {
        const stepId = stepIds[i];
        if (!stepId) continue;
        await tx
          .update(schema.course_lesson_steps)
          .set({ step_order: i })
          .where(
            and(
              eq(schema.course_lesson_steps.id, stepId),
              eq(schema.course_lesson_steps.plan_id, planId)
            )
          );
      }
      const [plan] = await tx
        .select()
        .from(schema.course_lesson_plans)
        .where(eq(schema.course_lesson_plans.id, planId))
        .limit(1);
      if (!plan) throw new NotFoundException('Lesson plan not found');
      const steps = await tx
        .select()
        .from(schema.course_lesson_steps)
        .where(eq(schema.course_lesson_steps.plan_id, planId))
        .orderBy(asc(schema.course_lesson_steps.step_order));
      return mapPlan(plan as PlanRow, steps as StepRow[]);
    });
  }

  async publishPlan(id: string, tenantCtx: TenantContext) {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [row] = await tx
        .update(schema.course_lesson_plans)
        .set({ status: 'PUBLISHED', updated_at: new Date() })
        .where(eq(schema.course_lesson_plans.id, id))
        .returning();
      if (!row) throw new NotFoundException('Lesson plan not found');
      const steps = await tx
        .select()
        .from(schema.course_lesson_steps)
        .where(eq(schema.course_lesson_steps.plan_id, id))
        .orderBy(asc(schema.course_lesson_steps.step_order));
      this.logger.log(
        `[LessonPlanService] publishPlan id=${id} tenantId=${tenantCtx.tenantId}`
      );
      return mapPlan(row as PlanRow, steps as StepRow[]);
    });
  }
}
