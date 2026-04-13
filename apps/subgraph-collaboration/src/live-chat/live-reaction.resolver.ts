/**
 * LiveReactionResolver — Mutation and Subscription resolvers for reactions.
 */
import type { IncomingMessage } from 'http';
import {
  Resolver,
  Mutation,
  Subscription,
  Args,
  Context,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import { LiveReactionService } from './live-reaction.service';
import { subscribeReactionBurst } from './nats-pubsub.helper';

interface GraphQLContext {
  req: IncomingMessage;
  authContext?: AuthContext;
}

@Resolver('LiveReactionBurst')
export class LiveReactionResolver {
  private readonly logger = new Logger(LiveReactionResolver.name);

  constructor(private readonly reactionService: LiveReactionService) {}

  @Mutation('sendLiveReaction')
  async sendLiveReaction(
    @Args('sessionId') sessionId: string,
    @Args('emoji') emoji: string,
    @Args('streamTs') streamTs: number | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.reactionService.sendReaction(
      sessionId,
      emoji,
      context.authContext,
      streamTs
    );
  }

  @Subscription('liveReactionBurst')
  subscribeReactionBurst(@Args('sessionId') sessionId: string) {
    return subscribeReactionBurst(sessionId);
  }
}
