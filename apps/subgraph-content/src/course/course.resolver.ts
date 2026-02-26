import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { CourseService } from './course.service';
import { EnrollmentService } from './enrollment.service';
import { AdminEnrollmentService } from './admin-enrollment.service';
import { ModuleLoader } from '../module/module.loader';

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
    private readonly adminEnrollmentService: AdminEnrollmentService,
    private readonly moduleLoader: ModuleLoader
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
  async createCourse(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    return this.courseService.create(
      input as unknown as Parameters<CourseService['create']>[0]
    );
  }

  @Mutation('updateCourse')
  async updateCourse(
    @Args('id') id: string,
    @Args('input') input: Record<string, unknown>,
    @Context() _ctx: GqlContext
  ) {
    return this.courseService.update(
      id,
      input as unknown as Parameters<CourseService['update']>[1]
    );
  }

  // ── Enrollment ───────────────────────────────────────────────

  @Query('myEnrollments')
  async getMyEnrollments(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.getMyEnrollments(tenantCtx);
  }

  @Mutation('enrollCourse')
  async enrollCourse(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.enrollCourse(courseId, tenantCtx);
  }

  @Mutation('unenrollCourse')
  async unenrollCourse(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.enrollmentService.unenrollCourse(courseId, tenantCtx);
  }

  // ── Progress ─────────────────────────────────────────────────

  @Query('myCourseProgress')
  async getMyCourseProgress(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
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

  // ── Admin Enrollment (F-108) ─────────────────────────────────

  @Query('adminCourseEnrollments')
  async adminCourseEnrollments(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.adminEnrollmentService.getEnrollments(courseId, tenantCtx);
  }

  @Mutation('adminEnrollUser')
  async adminEnrollUser(
    @Args('courseId') courseId: string,
    @Args('userId') userId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.adminEnrollmentService.enrollUser(courseId, userId, tenantCtx);
  }

  @Mutation('adminUnenrollUser')
  async adminUnenrollUser(
    @Args('courseId') courseId: string,
    @Args('userId') userId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.adminEnrollmentService.unenrollUser(
      courseId,
      userId,
      tenantCtx
    );
  }

  @Mutation('adminBulkEnroll')
  async adminBulkEnroll(
    @Args('courseId') courseId: string,
    @Args('userIds') userIds: string[],
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.adminEnrollmentService.bulkEnroll(courseId, userIds, tenantCtx);
  }

  // ── Field Resolvers ──────────────────────────────────────────

  /**
   * ResolveField uses ModuleLoader (DataLoader) to batch all
   * modules requests for a list of courses into one DB query,
   * eliminating the N+1 problem.
   */
  @ResolveField('modules')
  async getModules(@Parent() course: CourseParent) {
    return this.moduleLoader.byCourseId.load(course.id);
  }
}
