/**
 * PeerMatchingResolver — GraphQL resolvers for peer matching + mentor path topology (GAP-6).
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { PeerMatchingService } from './peer-matching.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class PeerMatchingResolver {
  private readonly logger = new Logger(PeerMatchingResolver.name);

  constructor(private readonly peerMatchingService: PeerMatchingService) {}

  private getAuth(ctx: GraphQLContext): { userId: string; tenantId: string } {
    const userId = ctx.authContext?.userId;
    const tenantId = ctx.authContext?.tenantId;
    if (!userId || !tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return { userId, tenantId };
  }

  @Query('peerMatches')
  async peerMatches(
    @Args('courseId') courseId: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuth(ctx);
    return this.peerMatchingService.findPeerMatches(tenantId, userId, courseId);
  }

  @Query('myPeerMatchRequests')
  async myPeerMatchRequests(@Context() ctx: GraphQLContext) {
    const { userId, tenantId } = this.getAuth(ctx);
    return this.peerMatchingService.getMyPeerMatchRequests(tenantId, userId);
  }

  @Query('mentorsByPathTopology')
  async mentorsByPathTopology(
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuth(ctx);
    this.logger.log(
      { userId, courseId },
      '[PeerMatchingResolver] mentorsByPathTopology'
    );
    return this.peerMatchingService.findMentorsByPathTopology(
      userId,
      tenantId,
      courseId
    );
  }

  @Mutation('requestPeerMatch')
  async requestPeerMatch(
    @Args('matchedUserId') matchedUserId: string,
    @Args('courseId') courseId: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuth(ctx);
    return this.peerMatchingService.requestPeerMatch(
      tenantId,
      userId,
      matchedUserId,
      courseId
    );
  }

  @Mutation('respondToPeerMatch')
  async respondToPeerMatch(
    @Args('requestId') requestId: string,
    @Args('accept') accept: boolean,
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuth(ctx);
    return this.peerMatchingService.respondToPeerMatch(
      tenantId,
      userId,
      requestId,
      accept
    );
  }
}
