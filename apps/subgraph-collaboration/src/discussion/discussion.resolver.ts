/**
 * DiscussionResolver — Query, Mutation, Subscription, and Discussion field resolvers.
 * DiscussionMessage and DiscussionParticipant field resolvers are in discussion-field.resolver.ts.
 * Re-exports all resolver classes for backward-compatible imports.
 */
import type { IncomingMessage } from 'http';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
  Subscription,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { createPubSub } from 'graphql-yoga';
import { DiscussionService } from './discussion.service';
import { DiscussionInsightsService } from './discussion-insights.service';
import type { AuthContext } from '@edusphere/auth';
import {
  createDiscussionInputSchema,
  addMessageInputSchema,
  type CreateDiscussionInput,
  type AddMessageInput,
} from './discussion.schemas';

// Re-export field resolvers for backward-compatible imports
export {
  DiscussionMessageResolver,
  DiscussionParticipantResolver,
} from './discussion-field.resolver';

interface GraphQLContext {
  req: IncomingMessage;
  authContext?: AuthContext;
}

interface DiscussionRow {
  id: string;
  course_id: string;
  creator_id: string;
}

@Resolver('Discussion')
export class DiscussionResolver {
  private readonly logger = new Logger(DiscussionResolver.name);
  private pubSub: ReturnType<typeof createPubSub>;

  constructor(
    private readonly discussionService: DiscussionService,
    private readonly discussionInsightsService: DiscussionInsightsService
  ) {
    this.pubSub = createPubSub();
  }

  @Query('discussion')
  async getDiscussion(
    @Args('id') id: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findDiscussionById(id, context.authContext);
  }

  @Query('discussions')
  async getDiscussions(
    @Args('courseId') courseId: string,
    @Args('limit') limit: number = 20,
    @Args('offset') offset: number = 0,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findDiscussionsByCourse(
      courseId,
      limit,
      offset,
      context.authContext
    );
  }

  @Query('myDiscussions')
  async getMyDiscussions(
    @Args('limit') limit: number = 20,
    @Args('offset') offset: number = 0,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findDiscussionsByUser(
      limit,
      offset,
      context.authContext
    );
  }

  @Query('discussionMessages')
  async getDiscussionMessages(
    @Args('discussionId') discussionId: string,
    @Args('limit') limit: number = 50,
    @Args('offset') offset: number = 0,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findMessagesByDiscussion(
      discussionId,
      limit,
      offset,
      context.authContext
    );
  }

  @Mutation('createDiscussion')
  async createDiscussion(
    @Args('input') input: CreateDiscussionInput,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    const validated = createDiscussionInputSchema.parse(input);
    return this.discussionService.createDiscussion(
      validated,
      context.authContext
    );
  }

  @Mutation('addMessage')
  async addMessage(
    @Args('discussionId') discussionId: string,
    @Args('input') input: AddMessageInput,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    const validated = addMessageInputSchema.parse(input);
    const message = await this.discussionService.addMessage(
      discussionId,
      validated,
      context.authContext
    );
    this.pubSub.publish(`messageAdded_${discussionId}`, {
      messageAdded: message,
    });
    return message;
  }

  @Mutation('joinDiscussion')
  async joinDiscussion(
    @Args('discussionId') discussionId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.joinDiscussion(
      discussionId,
      context.authContext
    );
  }

  @Mutation('leaveDiscussion')
  async leaveDiscussion(
    @Args('discussionId') discussionId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.leaveDiscussion(
      discussionId,
      context.authContext
    );
  }

  @Mutation('generateDiscussionSummary')
  async generateDiscussionSummary(
    @Args('discussionId') discussionId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    const discussion = await this.discussionService.findDiscussionById(
      discussionId,
      context.authContext
    );
    const messages = await this.discussionService.findMessagesByDiscussion(
      discussionId,
      50,
      0,
      context.authContext
    );
    const messageDtos = messages.map(
      (m: { content: string; user_id: string }) => ({
        content: m.content,
        userId: m.user_id,
      })
    );
    return this.discussionInsightsService.summarizeThread(
      messageDtos,
      (discussion as { title: string }).title
    );
  }

  @Subscription('messageAdded')
  subscribeToMessages(@Args('discussionId') discussionId: string) {
    return this.pubSub.subscribe(`messageAdded_${discussionId}`);
  }

  @ResolveField('course')
  resolveCourse(@Parent() discussion: DiscussionRow) {
    return { __typename: 'Course', id: discussion.course_id };
  }

  @ResolveField('creator')
  resolveCreator(@Parent() discussion: DiscussionRow) {
    return { __typename: 'User', id: discussion.creator_id };
  }

  @ResolveField('messages')
  async resolveMessages(
    @Parent() discussion: DiscussionRow,
    @Args('limit') limit: number = 50,
    @Args('offset') offset: number = 0,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findMessagesByDiscussion(
      discussion.id,
      limit,
      offset,
      context.authContext
    );
  }

  @ResolveField('participants')
  async resolveParticipants(
    @Parent() discussion: DiscussionRow,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findParticipantsByDiscussion(
      discussion.id,
      context.authContext
    );
  }

  @ResolveField('participantCount')
  async resolveParticipantCount(
    @Parent() discussion: DiscussionRow,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.countParticipants(
      discussion.id,
      context.authContext
    );
  }

  @ResolveField('messageCount')
  async resolveMessageCount(
    @Parent() discussion: DiscussionRow,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.countMessages(
      discussion.id,
      context.authContext
    );
  }
}
