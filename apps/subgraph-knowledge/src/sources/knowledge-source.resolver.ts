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
  async addFileSource(
    @Args('input')
    input: {
      courseId: string;
      title: string;
      fileName: string;
      contentBase64: string;
      mimeType: string;
    },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const fileBuffer = Buffer.from(input.contentBase64, 'base64');
    const lower = input.fileName.toLowerCase();
    const sourceType =
      lower.endsWith('.pdf') || input.mimeType === 'application/pdf'
        ? ('FILE_PDF' as const)
        : lower.endsWith('.docx') ||
            input.mimeType.includes('wordprocessingml')
          ? ('FILE_DOCX' as const)
          : ('FILE_TXT' as const);

    return this.service.createAndProcess({
      tenantId,
      courseId: input.courseId,
      title: input.title,
      sourceType,
      origin: input.fileName,
      fileBuffer,
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
