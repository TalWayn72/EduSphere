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
import type { AuthContext } from '@edusphere/auth';
import {
  createDiscussionInputSchema,
  addMessageInputSchema,
  type CreateDiscussionInput,
  type AddMessageInput,
} from './discussion.schemas';

interface GraphQLContext {
  req: IncomingMessage;
  authContext?: AuthContext;
}

interface DiscussionRow {
  id: string;
  course_id: string;
  creator_id: string;
}

interface MessageRow {
  id: string;
  discussion_id: string;
  user_id: string;
  parent_message_id: string | null;
}

interface ParticipantRow {
  discussion_id: string;
  user_id: string;
}

@Resolver('Discussion')
export class DiscussionResolver {
  private readonly logger = new Logger(DiscussionResolver.name);
  private pubSub: ReturnType<typeof createPubSub>;

  constructor(private readonly discussionService: DiscussionService) {
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

    // Publish to subscription
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

  @Subscription('messageAdded')
  subscribeToMessages(@Args('discussionId') discussionId: string) {
    return this.pubSub.subscribe(`messageAdded_${discussionId}`);
  }

  // Field resolvers
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

@Resolver('DiscussionMessage')
export class DiscussionMessageResolver {
  private readonly logger = new Logger(DiscussionMessageResolver.name);

  constructor(private readonly discussionService: DiscussionService) {}

  @ResolveField('discussion')
  async resolveDiscussion(
    @Parent() message: MessageRow,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findDiscussionById(
      message.discussion_id,
      context.authContext
    );
  }

  @ResolveField('user')
  resolveUser(@Parent() message: MessageRow) {
    return { __typename: 'User', id: message.user_id };
  }

  @ResolveField('parentMessage')
  async resolveParentMessage(
    @Parent() message: MessageRow,
    @Context() context: GraphQLContext
  ) {
    if (!message.parent_message_id) return null;
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findMessageById(
      message.parent_message_id,
      context.authContext
    );
  }

  @ResolveField('replies')
  async resolveReplies(
    @Parent() message: MessageRow,
    @Args('limit') limit: number = 20,
    @Args('offset') offset: number = 0,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findRepliesByParent(
      message.id,
      limit,
      offset,
      context.authContext
    );
  }

  @ResolveField('replyCount')
  async resolveReplyCount(
    @Parent() message: MessageRow,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.countReplies(message.id, context.authContext);
  }
}

@Resolver('DiscussionParticipant')
export class DiscussionParticipantResolver {
  private readonly logger = new Logger(DiscussionParticipantResolver.name);

  constructor(private readonly discussionService: DiscussionService) {}

  @ResolveField('discussion')
  async resolveDiscussion(
    @Parent() participant: ParticipantRow,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.discussionService.findDiscussionById(
      participant.discussion_id,
      context.authContext
    );
  }

  @ResolveField('user')
  resolveUser(@Parent() participant: ParticipantRow) {
    return { __typename: 'User', id: participant.user_id };
  }
}
