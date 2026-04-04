import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { EnrichedLessonService } from './enriched-lesson.service';
import {
  IngestYoutubeLessonSchema,
  UpdateCitationSchema,
  SetBlockAnchorTimestampSchema,
} from './enriched-lesson.schemas';
import { mapBlock, mapCitation } from './enriched-lesson.helpers';
import type { EnrichedLessonView } from './enriched-lesson.helpers';

interface GqlContext {
  authContext?: AuthContext;
}

interface BlockParent {
  citationId?: string | null;
  anchorId?: string | null;
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

@Resolver('EnrichedLesson')
export class EnrichedLessonResolver {
  constructor(private readonly service: EnrichedLessonService) {}

  @Query('enrichedLesson')
  async getEnrichedLesson(
    @Args('lessonId') lessonId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.service.getEnrichedLesson(lessonId, tenantCtx);
  }

  @Mutation('ingestYoutubeLesson')
  async ingestYoutubeLesson(
    @Args('input') input: { lessonId: string; youtubeUrl: string },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const parsed = IngestYoutubeLessonSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.ingestYoutubeLesson(parsed.data, tenantCtx);
  }

  @Mutation('updateLessonCitation')
  async updateLessonCitation(
    @Args('citationId') citationId: string,
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const parsed = UpdateCitationSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.updateCitation(citationId, parsed.data, tenantCtx);
  }

  @Mutation('setBlockAnchorTimestamp')
  async setBlockAnchorTimestamp(
    @Args('input')
    input: { blockId: string; startTime: number; endTime?: number },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const parsed = SetBlockAnchorTimestampSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }
    return this.service.setBlockAnchorTimestamp(parsed.data, tenantCtx);
  }

  @Mutation('publishEnrichedLesson')
  async publishEnrichedLesson(
    @Args('lessonId') lessonId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.service.publishEnrichedLesson(lessonId, tenantCtx);
  }

  // ── Field Resolvers ──────────────────────────────────────────────

  @ResolveField('blocks')
  async getBlocks(
    @Parent() enriched: EnrichedLessonView,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const rows = await this.service.getBlocks(enriched.lessonId, tenantCtx);
    return rows.map((r) => mapBlock(r as Record<string, unknown>));
  }

  @ResolveField('citations')
  async getCitations(
    @Parent() enriched: EnrichedLessonView,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const rows = await this.service.getCitations(enriched.lessonId, tenantCtx);
    return rows.map((r) => mapCitation(r as Record<string, unknown>));
  }
}

@Resolver('EnrichedTranscriptBlock')
export class EnrichedTranscriptBlockResolver {
  constructor(private readonly service: EnrichedLessonService) {}

  @ResolveField('citation')
  async getCitation(@Parent() block: BlockParent) {
    // Citation is loaded as part of the block query — return null if not linked
    if (!block.citationId) return null;
    // Citation data is resolved through the parent enrichedLesson.citations
    return { __typename: 'LessonCitation', id: block.citationId };
  }

  @ResolveField('anchor')
  async getAnchor(@Parent() block: BlockParent) {
    if (!block.anchorId) return null;
    return { __typename: 'VisualAnchor', id: block.anchorId };
  }
}
