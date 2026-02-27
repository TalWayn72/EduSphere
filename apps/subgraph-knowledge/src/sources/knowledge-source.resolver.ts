import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import { KnowledgeSourceService } from './knowledge-source.service.js';
import type { KnowledgeSource } from '@edusphere/db';

@Resolver('KnowledgeSource')
export class KnowledgeSourceResolver {
  constructor(private readonly service: KnowledgeSourceService) {}

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId)
      throw new UnauthorizedException('Auth required');
    return { tenantId: ctx.authContext.tenantId };
  }

  /** Map Drizzle snake_case row → GraphQL camelCase object */
  private toGQL(s: KnowledgeSource) {
    return {
      id: s.id,
      courseId: s.course_id ?? '',
      tenantId: s.tenant_id,
      title: s.title,
      sourceType: s.source_type,
      origin: s.origin,
      rawContent: s.raw_content,
      preview: s.raw_content?.slice(0, 500) ?? null,
      status: s.status,
      chunkCount: s.chunk_count,
      errorMessage: s.error_message,
      metadata: s.metadata,
      createdAt:
        s.created_at instanceof Date
          ? s.created_at.toISOString()
          : s.created_at,
    };
  }

  @Query()
  async courseKnowledgeSources(
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    const rows = await this.service.listByCourseSources(tenantId, courseId);
    return rows.map((r) => this.toGQL(r));
  }

  @Query()
  async knowledgeSource(
    @Args('id') id: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.toGQL(await this.service.findById(id, tenantId));
  }

  @Mutation()
  async addUrlSource(
    @Args('input') input: { courseId: string; title: string; url: string },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.toGQL(
      await this.service.createAndProcess({
        tenantId,
        courseId: input.courseId,
        title: input.title,
        sourceType: 'URL',
        origin: input.url,
      })
    );
  }

  @Mutation()
  async addTextSource(
    @Args('input') input: { courseId: string; title: string; text: string },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.toGQL(
      await this.service.createAndProcess({
        tenantId,
        courseId: input.courseId,
        title: input.title,
        sourceType: 'TEXT',
        origin: 'manual',
        rawText: input.text,
      })
    );
  }

  @Mutation()
  async addYoutubeSource(
    @Args('input') input: { courseId: string; title: string; url: string },
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.auth(ctx);
    return this.toGQL(
      await this.service.createAndProcess({
        tenantId,
        courseId: input.courseId,
        title: input.title,
        sourceType: 'YOUTUBE',
        origin: input.url,
      })
    );
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

    return this.toGQL(
      await this.service.createAndProcess({
        tenantId,
        courseId: input.courseId,
        title: input.title,
        sourceType,
        origin: input.fileName,
        fileBuffer,
      })
    );
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
