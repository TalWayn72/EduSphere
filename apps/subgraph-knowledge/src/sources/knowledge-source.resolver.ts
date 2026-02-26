import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import { KnowledgeSourceService } from './knowledge-source.service.js';

@Resolver('KnowledgeSource')
export class KnowledgeSourceResolver {
  constructor(private readonly service: KnowledgeSourceService) {}

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId)
      throw new UnauthorizedException('Auth required');
    return { tenantId: ctx.authContext.tenantId };
  }

  @Query()
  async courseKnowledgeSources(
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.service.listByCourseSources(tenantId, courseId);
  }

  @Query()
  async knowledgeSource(
    @Args('id') id: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.service.findById(id, tenantId);
  }

  @Mutation()
  async addUrlSource(
    @Args('input') input: { courseId: string; title: string; url: string },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.service.createAndProcess({
      tenantId,
      courseId: input.courseId,
      title: input.title,
      sourceType: 'URL',
      origin: input.url,
    });
  }

  @Mutation()
  async addTextSource(
    @Args('input') input: { courseId: string; title: string; text: string },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.service.createAndProcess({
      tenantId,
      courseId: input.courseId,
      title: input.title,
      sourceType: 'TEXT',
      origin: 'manual',
      rawText: input.text,
    });
  }

  @Mutation()
  async addYoutubeSource(
    @Args('input') input: { courseId: string; title: string; url: string },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.service.createAndProcess({
      tenantId,
      courseId: input.courseId,
      title: input.title,
      sourceType: 'YOUTUBE',
      origin: input.url,
    });
  }

  @Mutation()
  async deleteKnowledgeSource(
    @Args('id') id: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    await this.service.deleteSource(id, tenantId);
    return true;
  }
}
