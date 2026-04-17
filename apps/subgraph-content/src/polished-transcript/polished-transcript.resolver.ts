import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { PolishedTranscriptService } from './polished-transcript.service';
import { PolishedTranscriptMutationsService } from './polished-transcript-mutations.service';
import { PolishingSubscriptionService } from './polished-transcript-subscription.service';
import {
  EditPolishedBlockSchema,
  ChangeDecisionSchema,
  BulkChangeDecisionSchema,
} from './polished-transcript.schemas';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: auth.roles?.[0] ?? 'STUDENT',
  };
}

@Resolver('PolishedTranscript')
export class PolishedTranscriptResolver {
  constructor(
    private readonly queries: PolishedTranscriptService,
    private readonly mutations: PolishedTranscriptMutationsService,
    private readonly subscriptions: PolishingSubscriptionService
  ) {}

  // ── Queries ────────────────────────────────────────────────────────────────

  @Query('polishedTranscript')
  async polishedTranscript(
    @Args('lessonId') lessonId: string,
    @Context() ctx: GqlContext
  ) {
    return this.queries.getPolishedTranscript(lessonId, requireAuth(ctx));
  }

  @Query('polishedTranscriptVersions')
  async polishedTranscriptVersions(
    @Args('lessonId') lessonId: string,
    @Context() ctx: GqlContext
  ) {
    return this.queries.listPolishedTranscriptVersions(lessonId, requireAuth(ctx));
  }

  @Query('myVoiceProfile')
  async myVoiceProfile(@Context() ctx: GqlContext) {
    return this.queries.getMyVoiceProfile(requireAuth(ctx));
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  @Mutation('approvePolishedTranscript')
  async approvePolishedTranscript(
    @Args('polishedTranscriptId') polishedTranscriptId: string,
    @Context() ctx: GqlContext
  ) {
    return this.mutations.approvePolishedTranscript(polishedTranscriptId, requireAuth(ctx));
  }

  @Mutation('editPolishedBlock')
  async editPolishedBlock(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const parsed = EditPolishedBlockSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message);
    return this.mutations.editPolishedBlock(parsed.data, requireAuth(ctx));
  }

  @Mutation('revertPolishedBlock')
  async revertPolishedBlock(
    @Args('blockId') blockId: string,
    @Context() ctx: GqlContext
  ) {
    return this.mutations.revertPolishedBlock(blockId, requireAuth(ctx));
  }

  @Mutation('decidePolishedChange')
  async decidePolishedChange(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const parsed = ChangeDecisionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message);
    return this.mutations.decidePolishedChange(parsed.data, requireAuth(ctx));
  }

  @Mutation('bulkDecidePolishedChanges')
  async bulkDecidePolishedChanges(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const parsed = BulkChangeDecisionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message);
    return this.mutations.bulkDecidePolishedChanges(parsed.data, requireAuth(ctx));
  }

  @Mutation('regeneratePolishedTranscript')
  async regeneratePolishedTranscript(
    @Args('lessonId') lessonId: string,
    @Context() ctx: GqlContext
  ) {
    return this.mutations.regeneratePolishedTranscript(lessonId, requireAuth(ctx));
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  @Subscription('polishingProgress', {
    filter: (
      payload: { polishingProgress: { lessonId: string } },
      variables: { lessonId: string }
    ) => payload.polishingProgress.lessonId === variables.lessonId,
    resolve: (payload: { polishingProgress: unknown }) => payload.polishingProgress,
  })
  async polishingProgress(
    @Args('lessonId') lessonId: string,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    return this.subscriptions.iteratorForLesson(lessonId);
  }
}
