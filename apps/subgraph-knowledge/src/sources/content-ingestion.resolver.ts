import { randomUUID } from 'node:crypto';
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import type { ContentIngestionResultDto } from './content-ingestion.dto.js';

/**
 * ContentIngestionResolver — stub for Phase 40 Sprint D ingestContent mutation.
 * Full OCR pipeline (Tesseract → PaddleOCR → TrOCR) implemented in PD1/PD2.
 */
@Resolver()
export class ContentIngestionResolver {
  private readonly logger = new Logger(ContentIngestionResolver.name);

  private auth(ctx: GraphQLContext) {
    if (!ctx.authContext?.tenantId) {
      throw new UnauthorizedException('Auth required');
    }
    return {
      tenantId: ctx.authContext.tenantId,
      userId: ctx.authContext.userId ?? 'unknown',
    };
  }

  @Mutation('ingestContent')
  async ingestContent(
    @Args('file') _file: unknown,
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext,
  ): Promise<ContentIngestionResultDto> {
    const { tenantId } = this.auth(ctx);
    this.logger.warn(
      `ingestContent called for course ${courseId} by tenant ${tenantId} — stub`,
    );
    return {
      contentItemId: randomUUID(),
      extractedText: '',
      aiCaption: null,
      isHandwritten: false,
      ocrMethod: 'NONE',
      ocrConfidence: 1,
      topics: [],
      thumbnailUrl: null,
      estimatedDuration: 0,
      pageCount: null,
      warnings: [
        'ingestContent: stub implementation — full OCR pipeline in Phase 40 Sprint D PD1/PD2',
      ],
    };
  }
}
