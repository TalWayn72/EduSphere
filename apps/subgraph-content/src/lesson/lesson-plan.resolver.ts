import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { LessonPlanService } from './lesson-plan.service';

interface GqlContext {
  authContext?: AuthContext;
}

interface CreateLessonPlanInput {
  courseId: string;
  title: string;
}

interface AddLessonStepInput {
  planId: string;
  stepType: string;
  config?: Record<string, unknown>;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth || !auth.tenantId || !auth.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: auth.roles[0] ?? 'STUDENT',
  };
}

@Resolver()
export class LessonPlanResolver {
  constructor(private readonly svc: LessonPlanService) {}

  @Query('courseLessonPlan')
  async courseLessonPlan(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    return this.svc.getPlan(id, requireAuth(ctx));
  }

  @Query('myCourseLessonPlans')
  async myCourseLessonPlans(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
    return this.svc.getByCoursId(courseId, requireAuth(ctx));
  }

  @Mutation('createLessonPlan')
  async createLessonPlan(
    @Args('input') input: CreateLessonPlanInput,
    @Context() ctx: GqlContext
  ) {
    return this.svc.createPlan(input.courseId, requireAuth(ctx), input.title);
  }

  @Mutation('addLessonStep')
  async addLessonStep(
    @Args('input') input: AddLessonStepInput,
    @Context() ctx: GqlContext
  ) {
    return this.svc.addStep(
      input.planId,
      requireAuth(ctx),
      input.stepType,
      input.config ?? {}
    );
  }

  @Mutation('reorderLessonSteps')
  async reorderLessonSteps(
    @Args('planId') planId: string,
    @Args('stepIds') stepIds: string[],
    @Context() ctx: GqlContext
  ) {
    return this.svc.reorderSteps(planId, requireAuth(ctx), stepIds);
  }

  @Mutation('publishLessonPlan')
  async publishLessonPlan(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    return this.svc.publishPlan(id, requireAuth(ctx));
  }
}
