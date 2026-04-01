/**
 * DiscussionFieldResolvers — Field resolvers for DiscussionMessage and DiscussionParticipant.
 * Extracted from discussion.resolver.ts for file-size compliance (<300 lines).
 */
import { Resolver, Args, Context, ResolveField, Parent } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
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
