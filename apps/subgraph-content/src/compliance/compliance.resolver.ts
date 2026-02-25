import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { ComplianceService } from './compliance.service.js';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: (auth.roles[0] ?? 'STUDENT') as TenantContext['userRole'],
  };
}

function parseOptionalDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

@Resolver()
export class ComplianceResolver {
  constructor(private readonly complianceService: ComplianceService) {}

  @Query('complianceCourses')
  async getComplianceCourses(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const courses = await this.complianceService.listComplianceCourses(tenantCtx);
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      isCompliance: c.is_compliance,
      complianceDueDate: c.compliance_due_date?.toISOString() ?? null,
      isPublished: c.is_published,
      estimatedHours: c.estimated_hours ?? null,
    }));
  }

  @Mutation('generateComplianceReport')
  async generateComplianceReport(
    @Args('courseIds') courseIds: string[],
    @Args('asOf') asOf: string | undefined,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireAuth(ctx);
    const asOfDate = parseOptionalDate(asOf);
    const result = await this.complianceService.generateComplianceReport(courseIds, tenantCtx, asOfDate);
    return {
      csvUrl: result.csvUrl,
      pdfUrl: result.pdfUrl,
      summary: {
        ...result.summary,
        generatedAt: result.summary.generatedAt.toISOString(),
      },
    };
  }

  @Mutation('updateCourseComplianceSettings')
  async updateCourseComplianceSettings(
    @Args('courseId') courseId: string,
    @Args('isCompliance') isCompliance: boolean,
    @Args('complianceDueDate') complianceDueDate: string | undefined,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireAuth(ctx);
    const dueDate = parseOptionalDate(complianceDueDate) ?? null;
    const course = await this.complianceService.updateCourseComplianceSettings(
      courseId, isCompliance, dueDate, tenantCtx,
    );
    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      isCompliance: course.is_compliance,
      complianceDueDate: course.compliance_due_date?.toISOString() ?? null,
      isPublished: course.is_published,
      estimatedHours: course.estimated_hours ?? null,
    };
  }
}
