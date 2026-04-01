import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { LessonPipelineTemplateService } from './lesson-pipeline-template.service';
import type {
  CreatePipelineTemplateInput,
  UpdatePipelineTemplateInput,
} from './lesson-pipeline-template.service';

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

@Resolver('LessonPipelineTemplate')
export class LessonPipelineTemplateResolver {
  constructor(
    private readonly templateService: LessonPipelineTemplateService
  ) {}

  @Query('pipelineTemplates')
  async getPipelineTemplates(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.templateService.findAll(tenantCtx.tenantId);
  }

  @Mutation('createPipelineTemplate')
  async createPipelineTemplate(
    @Args('input') input: CreatePipelineTemplateInput,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.templateService.create(
      input,
      tenantCtx.tenantId,
      tenantCtx.userId
    );
  }

  @Mutation('updatePipelineTemplate')
  async updatePipelineTemplate(
    @Args('id') id: string,
    @Args('input') input: UpdatePipelineTemplateInput,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.templateService.update(id, input, tenantCtx.tenantId);
  }

  @Mutation('deletePipelineTemplate')
  async deletePipelineTemplate(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.templateService.delete(id, tenantCtx.tenantId);
  }
}
