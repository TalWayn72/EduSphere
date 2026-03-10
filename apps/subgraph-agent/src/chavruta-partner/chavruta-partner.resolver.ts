/**
 * ChavrutaPartnerMatchResolver — GraphQL resolvers for GAP-3 Chavruta partner matching.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ChavrutaPartnerMatchService } from './chavruta-partner.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class ChavrutaPartnerMatchResolver {
  private readonly logger = new Logger(ChavrutaPartnerMatchResolver.name);

  constructor(private readonly service: ChavrutaPartnerMatchService) {}

  private getAuth(ctx: GraphQLContext): { userId: string; tenantId: string } {
    const userId = ctx.authContext?.userId;
    const tenantId = ctx.authContext?.tenantId;
    if (!userId || !tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return { userId, tenantId };
  }

  @Query('chavrutaPartnerMatches')
  async chavrutaPartnerMatches(
    @Args('input') input: { courseId: string; preferredTopic?: string },
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuth(ctx);
    this.logger.log(
      { userId, courseId: input.courseId },
      '[ChavrutaPartnerMatchResolver] findPartnerForDebate'
    );
    return this.service.findPartnerForDebate(userId, tenantId, input);
  }

  @Query('myChavrutaPartnerSessions')
  async myChavrutaPartnerSessions(@Context() ctx: GraphQLContext) {
    const { userId, tenantId } = this.getAuth(ctx);
    return this.service.getMyPartnerSessions(userId, tenantId);
  }

  @Mutation('createChavrutaPartnerSession')
  async createChavrutaPartnerSession(
    @Args('input') input: { partnerId: string; courseId: string; topic: string },
    @Context() ctx: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuth(ctx);
    this.logger.log(
      { userId, partnerId: input.partnerId, courseId: input.courseId },
      '[ChavrutaPartnerMatchResolver] createPartnerSession'
    );
    return this.service.createPartnerSession(
      userId,
      tenantId,
      input.partnerId,
      input.courseId,
      input.topic
    );
  }
}
