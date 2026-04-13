/**
 * LiveQAResolver — Query, Mutation, Subscription, and field resolvers for LiveQAQuestion.
 */
import type { IncomingMessage } from 'http';
import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import { LiveQAService } from './live-qa.service';
import { subscribeQAUpdated } from './nats-pubsub.helper';

interface GraphQLContext {
  req: IncomingMessage;
  authContext?: AuthContext;
}

interface QARow {
  id: string;
  user_id: string;
  session_id: string;
}

@Resolver('LiveQAQuestion')
export class LiveQAResolver {
  private readonly logger = new Logger(LiveQAResolver.name);

  constructor(private readonly qaService: LiveQAService) {}

  // ─── Queries ───────────────────────────────────────────────────────────────

  @Query('liveQAQuestions')
  async getLiveQAQuestions(
    @Args('sessionId') sessionId: string,
    @Args('status') status: string | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.qaService.getQuestions(sessionId, context.authContext, status);
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  @Mutation('askLiveQuestion')
  async askLiveQuestion(
    @Args('sessionId') sessionId: string,
    @Args('question') question: string,
    @Args('streamTs') streamTs: number | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.qaService.askQuestion(
      sessionId,
      question,
      context.authContext,
      streamTs
    );
  }

  @Mutation('upvoteLiveQuestion')
  async upvoteLiveQuestion(
    @Args('questionId') questionId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.qaService.upvoteQuestion(questionId, context.authContext);
  }

  @Mutation('answerLiveQuestion')
  async answerLiveQuestion(
    @Args('questionId') questionId: string,
    @Args('answer') answer: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.qaService.answerQuestion(
      questionId,
      answer,
      context.authContext
    );
  }

  @Mutation('dismissLiveQuestion')
  async dismissLiveQuestion(
    @Args('questionId') questionId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.qaService.dismissQuestion(questionId, context.authContext);
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  @Subscription('liveQAUpdated')
  subscribeQAUpdated(@Args('sessionId') sessionId: string) {
    return subscribeQAUpdated(sessionId);
  }

  // ─── Field Resolvers ───────────────────────────────────────────────────────

  @ResolveField('user')
  resolveUser(@Parent() row: QARow) {
    return { __typename: 'User', id: row.user_id };
  }

  @ResolveField('isUpvotedByMe')
  async resolveIsUpvotedByMe(
    @Parent() row: QARow,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) return false;
    const tenantCtx = this.qaService.toTenantContext(context.authContext);
    return this.qaService.isUpvotedByUser(
      row.id,
      context.authContext.userId,
      tenantCtx
    );
  }
}
