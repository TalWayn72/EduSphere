/**
 * LiveStreamResolver — Query, Mutation, and field resolvers for live stream management.
 * Subscription resolvers are in live-stream.subscription.ts.
 */
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import {
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { z } from 'zod';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamQueryService } from './live-stream-query.service';
import { PresenceService } from './presence.service';
import type { GraphQLContext } from '../auth/auth.middleware';

const INSTRUCTOR_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN', 'ADMIN']);

const createLiveStreamSchema = z.object({
  sessionId: z.string().uuid(),
  streamType: z.enum(['BBB', 'LIVEKIT', 'EXTERNAL']).default('BBB'),
  lessonId: z.string().uuid().optional(),
  maxViewers: z.number().int().min(0).optional(),
  autoRecord: z.boolean().optional(),
});

const updateLiveStreamSchema = z.object({
  sessionId: z.string().uuid(),
  maxViewers: z.number().int().min(0).optional(),
  autoRecord: z.boolean().optional(),
});

interface SessionRow {
  id: string;
  instructorId: string | null;
  tenantId: string;
}

function extractTenantId(ctx: GraphQLContext): string {
  if (ctx.authContext?.tenantId) return ctx.authContext.tenantId;
  const header = ctx.req?.headers?.['x-tenant-id'];
  return (Array.isArray(header) ? header[0] : header) ?? '';
}

function requireAuth(ctx: GraphQLContext) {
  if (!ctx.authContext?.userId)
    throw new UnauthorizedException('Authentication required');
  return {
    userId: ctx.authContext.userId,
    tenantId: extractTenantId(ctx),
    role: ctx.authContext.role ?? '',
  };
}

function requireInstructor(ctx: GraphQLContext) {
  const auth = requireAuth(ctx);
  if (!INSTRUCTOR_ROLES.has(auth.role))
    throw new ForbiddenException('Instructor role required');
  return auth;
}

@Resolver('LiveStreamSession')
export class LiveStreamResolver {
  private readonly logger = new Logger(LiveStreamResolver.name);

  constructor(
    private readonly liveStreamService: LiveStreamService,
    private readonly queryService: LiveStreamQueryService,
    private readonly presenceService: PresenceService
  ) {}

  @Query('liveStreamSession')
  async getLiveStreamSession(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = requireAuth(ctx);
    return this.liveStreamService.getSession(sessionId, tenantId);
  }

  @Query('activeLiveSessions')
  async getActiveLiveSessions(
    @Args('courseId') courseId: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = requireAuth(ctx);
    return this.queryService.getActiveSessions(tenantId, courseId);
  }

  @Query('livePresence')
  async getLivePresence(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = requireAuth(ctx);
    return this.presenceService.getActiveViewers(sessionId, tenantId);
  }

  @Query('liveTranscript')
  async getLiveTranscript(
    @Args('sessionId') sessionId: string,
    @Args('afterIndex') afterIndex: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = requireAuth(ctx);
    return this.queryService.getTranscript(sessionId, tenantId, afterIndex ?? -1);
  }

  @Mutation('createLiveStream')
  async createLiveStream(
    @Args('sessionId') sessionId: string,
    @Args('streamType') streamType: string,
    @Args('lessonId') lessonId: string | undefined,
    @Args('maxViewers') maxViewers: number | undefined,
    @Args('autoRecord') autoRecord: boolean | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = requireInstructor(ctx);
    const input = createLiveStreamSchema.parse({ sessionId, streamType, lessonId, maxViewers, autoRecord });
    return this.liveStreamService.createConfig(
      input.sessionId,
      tenantId,
      userId,
      { streamType: input.streamType, lessonId: input.lessonId, maxViewers: input.maxViewers, autoRecord: input.autoRecord }
    );
  }

  @Mutation('updateLiveStream')
  async updateLiveStream(
    @Args('sessionId') sessionId: string,
    @Args('maxViewers') maxViewers: number | undefined,
    @Args('autoRecord') autoRecord: boolean | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = requireInstructor(ctx);
    const input = updateLiveStreamSchema.parse({ sessionId, maxViewers, autoRecord });
    return this.liveStreamService.updateConfig(input.sessionId, tenantId, {
      maxViewers: input.maxViewers,
      autoRecord: input.autoRecord,
    });
  }

  @Mutation('startLiveStream')
  async startLiveStream(@Args('sessionId') sessionId: string, @Context() ctx: GraphQLContext) {
    const { userId, tenantId } = requireInstructor(ctx);
    return this.liveStreamService.transition(sessionId, tenantId, userId, 'start');
  }

  @Mutation('pauseLiveStream')
  async pauseLiveStream(@Args('sessionId') sessionId: string, @Context() ctx: GraphQLContext) {
    const { userId, tenantId } = requireInstructor(ctx);
    return this.liveStreamService.transition(sessionId, tenantId, userId, 'pause');
  }

  @Mutation('endLiveStream')
  async endLiveStream(@Args('sessionId') sessionId: string, @Context() ctx: GraphQLContext) {
    const { userId, tenantId } = requireInstructor(ctx);
    return this.liveStreamService.transition(sessionId, tenantId, userId, 'end');
  }

  @Mutation('toggleScreenShare')
  async toggleScreenShare(
    @Args('sessionId') sessionId: string,
    @Args('active') active: boolean,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = requireInstructor(ctx);
    return this.liveStreamService.toggleScreenShare(sessionId, tenantId, userId, active);
  }

  @Mutation('highlightMoment')
  async highlightMoment(
    @Args('sessionId') _sessionId: string,
    @Args('streamTs') _streamTs: number,
    @Args('label') _label: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    requireInstructor(ctx);
    // Highlight bookmark stored via live_bookmarks — placeholder for Phase 3
    return true;
  }

  @Mutation('joinLiveSession')
  async joinLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = requireAuth(ctx);
    return this.presenceService.join(sessionId, tenantId, userId);
  }

  @Mutation('leaveLiveSession')
  async leaveLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = requireAuth(ctx);
    await this.presenceService.leave(sessionId, tenantId, userId);
    return true;
  }

  @ResolveField('instructor')
  resolveInstructor(@Parent() session: SessionRow) {
    return { __typename: 'User', id: session.instructorId ?? '' };
  }
}
