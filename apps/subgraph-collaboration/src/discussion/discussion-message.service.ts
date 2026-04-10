/**
 * DiscussionMessageService — Message CRUD + reply/count logic.
 * Extracted from DiscussionService for file-size compliance (<300 lines).
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { schema, eq, and, desc, withTenantContext, sql } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import type { AddMessageInput } from './discussion.schemas';
import { DiscussionThreadService } from './discussion-thread.service';

@Injectable()
export class DiscussionMessageService {
  private readonly logger = new Logger(DiscussionMessageService.name);

  constructor(private readonly threadService: DiscussionThreadService) {}

  async findMessagesByDiscussion(
    discussionId: string,
    limit: number,
    offset: number,
    authContext: AuthContext
  ) {
    const tenantCtx = this.threadService.toTenantContext(authContext);

    return withTenantContext(this.threadService.db, tenantCtx, async (tx) => {
      await this.threadService.findDiscussionById(discussionId, authContext);

      return tx
        .select()
        .from(schema.discussion_messages)
        .where(eq(schema.discussion_messages.discussion_id, discussionId))
        .orderBy(desc(schema.discussion_messages.created_at))
        .limit(limit)
        .offset(offset);
    });
  }

  async findMessageById(id: string, authContext: AuthContext) {
    const tenantCtx = this.threadService.toTenantContext(authContext);

    return withTenantContext(this.threadService.db, tenantCtx, async (tx) => {
      const [message] = await tx
        .select()
        .from(schema.discussion_messages)
        .where(eq(schema.discussion_messages.id, id))
        .limit(1);

      return message || null;
    });
  }

  async findRepliesByParent(
    parentId: string,
    limit: number,
    offset: number,
    authContext: AuthContext
  ) {
    const tenantCtx = this.threadService.toTenantContext(authContext);

    return withTenantContext(this.threadService.db, tenantCtx, async (tx) => {
      return tx
        .select()
        .from(schema.discussion_messages)
        .where(eq(schema.discussion_messages.parent_message_id, parentId))
        .orderBy(desc(schema.discussion_messages.created_at))
        .limit(limit)
        .offset(offset);
    });
  }

  async countReplies(parentId: string, authContext: AuthContext) {
    const tenantCtx = this.threadService.toTenantContext(authContext);

    return withTenantContext(this.threadService.db, tenantCtx, async (tx) => {
      const result = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.discussion_messages)
        .where(eq(schema.discussion_messages.parent_message_id, parentId));

      return result[0]?.count || 0;
    });
  }

  async addMessage(
    discussionId: string,
    input: AddMessageInput,
    authContext: AuthContext
  ) {
    // SEC-3: maxLength 2000 — enforce content length limit
    if (input.content.length > 2000) {
      throw new BadRequestException(
        'Message content exceeds 2000 character limit'
      );
    }
    // SEC-3: Sanitize — strip all HTML tags to prevent stored XSS
    const sanitizedContent = input.content.replace(/<[^>]*>/g, '').trim();
    const sanitizedInput = { ...input, content: sanitizedContent };

    const tenantCtx = this.threadService.toTenantContext(authContext);

    return withTenantContext(this.threadService.db, tenantCtx, async (tx) => {
      await this.threadService.findDiscussionById(discussionId, authContext);

      if (input.parentMessageId) {
        const parent = await this.findMessageById(
          input.parentMessageId,
          authContext
        );
        if (!parent) {
          throw new NotFoundException(
            `Parent message ${input.parentMessageId} not found`
          );
        }
      }

      const messageValues: Record<string, unknown> = {
        discussion_id: discussionId,
        user_id: authContext.userId,
        content: sanitizedInput.content,
        message_type: sanitizedInput.messageType,
      };

      if (input.parentMessageId) {
        messageValues.parent_message_id = input.parentMessageId;
      }

      const [message] = await tx
        .insert(schema.discussion_messages)
        .values(messageValues as never)
        .returning();

      this.logger.log(
        `Message added: ${message.id} in discussion ${discussionId}`
      );
      return message;
    });
  }

  async countMessages(discussionId: string, authContext: AuthContext) {
    const tenantCtx = this.threadService.toTenantContext(authContext);

    return withTenantContext(this.threadService.db, tenantCtx, async (tx) => {
      const result = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.discussion_messages)
        .where(eq(schema.discussion_messages.discussion_id, discussionId));

      return result[0]?.count || 0;
    });
  }

  /**
   * Toggle like on a message: insert if not liked, delete if already liked.
   * Returns true when the message is now liked, false when unliked.
   * RLS on discussion_message_likes enforces tenant isolation.
   */
  async toggleLike(
    messageId: string,
    authContext: AuthContext
  ): Promise<boolean> {
    const tenantCtx = this.threadService.toTenantContext(authContext);

    return withTenantContext(this.threadService.db, tenantCtx, async (tx) => {
      // Check if like exists
      const [existing] = await tx
        .select({ messageId: schema.discussionMessageLikes.messageId })
        .from(schema.discussionMessageLikes)
        .where(
          and(
            eq(schema.discussionMessageLikes.messageId, messageId),
            eq(schema.discussionMessageLikes.userId, authContext.userId)
          )
        )
        .limit(1);

      if (existing) {
        // Remove like
        await tx
          .delete(schema.discussionMessageLikes)
          .where(
            and(
              eq(schema.discussionMessageLikes.messageId, messageId),
              eq(schema.discussionMessageLikes.userId, authContext.userId)
            )
          );
        this.logger.debug(`unliked message=${messageId} user=${authContext.userId}`);
        return false;
      }

      // Insert like
      await tx.insert(schema.discussionMessageLikes).values({
        messageId,
        userId: authContext.userId,
        tenantId: tenantCtx.tenantId,
      });
      this.logger.debug(`liked message=${messageId} user=${authContext.userId}`);
      return true;
    });
  }
}
