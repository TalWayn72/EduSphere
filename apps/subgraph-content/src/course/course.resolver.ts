import { Resolver, Query, Mutation, Args, Context, ResolveField, Parent } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { CourseService } from './course.service';
import { EnrollmentService } from './enrollment.service';
import { ModuleService } from '../module/module.service';

const tracer = trace.getTracer('subgraph-content');

interface GqlContext {
  authContext?: AuthContext;
}

interface CourseParent {
  id: string;
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

@Resolver('Course')
export class CourseResolver {
  constructor(
    private readonly courseService: CourseService,
    private readonly enrollmentService: EnrollmentService,
    private readonly moduleService: ModuleService,
  ) {}

  @Query('_health')
  health(): string {
    return 'ok';
  }

  @Query('course')
  async getCourse(@Args('id') id: string) {
    const span = tracer.startSpan('content.getCourse', {
      attributes: { 'course.id': id },
    });
    try {
      const result = await this.courseService.findById(id);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  }

  @Query('courses')
  async getCourses(
    @Args('limit') limit: number,
    @Args('offset') offset: number
  ) {
    return this.courseService.findAll(limit, offset);
  }

  @Mutation('createCourse')
  async createCourse(@Args('input') input: Record<string, unknown>, @Context() ctx: GqlContext) {
    requireAuth(ctx);
    return this.courseService.create(input as Parameters<CourseService['create']>[0]);
  }

  @Mutation('updateCourse')
  async updateCourse(
    @Args('id') id: string,
    @Args('input') input: Record<string, unknown>,
    @Context() _ctx: GqlContext
  ) {
    return this.courseService.update(id, input as Parameters<CourseService['update']>[1]);
  }

  // ── Enrollment ───────────────────────────────────────────────

  @Query('myEnrollments')
  async getMyEnrollments(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.getMyEnrollments(tenantCtx);
  }

  @Mutation('enrollCourse')
  async enrollCourse(@Args('courseId') courseId: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.enrollCourse(courseId, tenantCtx);
  }

  @Mutation('unenrollCourse')
  async unenrollCourse(@Args('courseId') courseId: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.unenrollCourse(courseId, tenantCtx);
  }

  // ── Progress ─────────────────────────────────────────────────

  @Query('myCourseProgress')
  async getMyCourseProgress(@Args('courseId') courseId: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.getCourseProgress(courseId, tenantCtx);
  }

  @Mutation('markContentViewed')
  async markContentViewed(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.markContentViewed(contentItemId, tenantCtx);
  }

  // ── Field Resolvers ──────────────────────────────────────────

  @ResolveField('modules')
  async getModules(@Parent() course: CourseParent) {
    return this.moduleService.findByCourse(course.id);
  }
}
