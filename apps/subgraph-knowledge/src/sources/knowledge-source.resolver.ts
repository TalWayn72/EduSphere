import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { KnowledgeSourceService } from './knowledge-source.service.js';

interface GqlContext {
  tenantId: string;
  userId: string;
}

@Resolver('KnowledgeSource')
export class KnowledgeSourceResolver {
  constructor(private readonly service: KnowledgeSourceService) {}

  @Query()
  @UseGuards(AuthGuard)
  async courseKnowledgeSources(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext,
  ) {
    return this.service.listByCourseSources(ctx.tenantId, courseId);
  }

  @Query()
  @UseGuards(AuthGuard)
  async knowledgeSource(
    @Args('id') id: string,
    @Context() ctx: GqlContext,
  ) {
    return this.service.findById(id, ctx.tenantId);
  }

  @Mutation()
  @UseGuards(AuthGuard)
  async addUrlSource(
    @Args('input') input: { courseId: string; title: string; url: string },
    @Context() ctx: GqlContext,
  ) {
    return this.service.createAndProcess({
      tenantId: ctx.tenantId,
      courseId: input.courseId,
      title: input.title,
      sourceType: 'URL',
      origin: input.url,
    });
  }

  @Mutation()
  @UseGuards(AuthGuard)
  async addTextSource(
    @Args('input') input: { courseId: string; title: string; text: string },
    @Context() ctx: GqlContext,
  ) {
    return this.service.createAndProcess({
      tenantId: ctx.tenantId,
      courseId: input.courseId,
      title: input.title,
      sourceType: 'TEXT',
      origin: 'manual',
      rawText: input.text,
    });
  }

  @Mutation()
  @UseGuards(AuthGuard)
  async deleteKnowledgeSource(
    @Args('id') id: string,
    @Context() ctx: GqlContext,
  ) {
    await this.service.deleteSource(id, ctx.tenantId);
    return true;
  }

  // Virtual field resolvers
  preview(parent: { raw_content?: string | null }) {
    if (!parent.raw_content) return null;
    return parent.raw_content.slice(0, 500);
  }
}
