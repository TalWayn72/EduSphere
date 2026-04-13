import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { CitationFormatService } from './citation-format.service';

interface GqlContext {
  authContext?: AuthContext;
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

@Resolver('CitationFormatConfig')
export class CitationFormatResolver {
  constructor(private readonly service: CitationFormatService) {}

  @Query('citationFormatConfigs')
  async citationFormatConfigs(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.service.getForCourse(tenantCtx, courseId);
  }

  @Mutation('setCitationFormat')
  async setCitationFormat(
    @Args('courseId') courseId: string,
    @Args('presetName') presetName: string,
    @Args('formatDescription') formatDescription: string | null,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.service.setFormat(
      tenantCtx,
      courseId,
      presetName,
      formatDescription
    );
  }
}
