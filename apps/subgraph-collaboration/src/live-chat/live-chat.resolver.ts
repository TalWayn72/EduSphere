/**
 * LiveChatResolver — Query, Mutation, Subscription, and field resolvers for LiveChatMessage.
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
import { LiveChatService } from './live-chat.service';
import {
  publishMessageAdded,
  subscribeMessageAdded,
} from './nats-pubsub.helper';

interface GraphQLContext {
  req: IncomingMessage;
  authContext?: AuthContext;
}

interface ChatMessageRow {
  id: string;
  user_id: string;
  reply_to_id?: string | null;
}

@Resolver('LiveChatMessage')
export class LiveChatResolver {
  private readonly logger = new Logger(LiveChatResolver.name);

  constructor(private readonly chatService: LiveChatService) {}

  // ─── Queries ───────────────────────────────────────────────────────────────

  @Query('liveChatMessages')
  async getLiveChatMessages(
    @Args('sessionId') sessionId: string,
    @Args('limit') limit: number = 50,
    @Args('before') before: string | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.chatService.getMessages(
      sessionId,
      limit,
      context.authContext,
      before
    );
  }

  // ─── Mutations ─────────────────────────────────────────────────────────────

  @Mutation('sendLiveChatMessage')
  async sendLiveChatMessage(
    @Args('sessionId') sessionId: string,
    @Args('content') content: string,
    @Args('replyToId') replyToId: string | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    const message = await this.chatService.sendMessage(
      sessionId,
      content,
      context.authContext,
      replyToId
    );
    await publishMessageAdded(sessionId, message);
    return message;
  }

  @Mutation('pinLiveChatMessage')
  async pinLiveChatMessage(
    @Args('messageId') messageId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    const updated = await this.chatService.pinMessage(
      messageId,
      context.authContext
    );
    await publishMessageAdded(updated.session_id, updated);
    return updated;
  }

  @Mutation('deleteLiveChatMessage')
  async deleteLiveChatMessage(
    @Args('messageId') messageId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.chatService.deleteMessage(messageId, context.authContext);
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  @Subscription('liveChatMessageAdded')
  subscribeChatMessages(@Args('sessionId') sessionId: string) {
    return subscribeMessageAdded(sessionId);
  }

  // ─── Field Resolvers ───────────────────────────────────────────────────────

  @ResolveField('user')
  resolveUser(@Parent() row: ChatMessageRow) {
    return { __typename: 'User', id: row.user_id };
  }

  @ResolveField('replyTo')
  resolveReplyTo(@Parent() row: ChatMessageRow) {
    if (!row.reply_to_id) return null;
    return { __typename: 'LiveChatMessage', id: row.reply_to_id };
  }
}
