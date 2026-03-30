/**
 * DiscussionThreadService — Discussion CRUD + participant management.
 * Extracted from DiscussionService for file-size compliance (<300 lines).
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  desc,
  inArray,
  withTenantContext,
  sql,
  closeAllPools,
  type Database,
  type TenantContext,
} from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import type { CreateDiscussionInput } from './discussion.schemas';

@Injectable()
export class DiscussionThreadService implements OnModuleDestroy {
  private readonly logger = new Logger(DiscussionThreadService.name);
  readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }

  async findDiscussionById(id: string, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [discussion] = await tx
        .select()
        .from(schema.discussions)
        .where(eq(schema.discussions.id, id))
        .limit(1);

      if (!discussion) {
        throw new NotFoundException(`Discussion ${id} not found`);
      }
      return discussion;
    });
  }

  async findDiscussionsByCourse(
    courseId: string,
    limit: number,
    offset: number,
    authContext: AuthContext
  ) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      return tx
        .select()
        .from(schema.discussions)
        .where(eq(schema.discussions.course_id, courseId))
        .orderBy(desc(schema.discussions.created_at))
        .limit(limit)
        .offset(offset);
    });
  }

  async createDiscussion(
    input: CreateDiscussionInput,
    authContext: AuthContext
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const values: Record<string, unknown> = {
        tenant_id: authContext.tenantId || '',
        course_id: input.courseId,
        title: input.title,
        creator_id: authContext.userId,
        discussion_type: input.discussionType,
      };

      if (input.description) {
        values.description = input.description;
      }

      const [discussion] = await tx
        .insert(schema.discussions)
        .values(values as never)
        .returning();

      await tx.insert(schema.discussion_participants).values({
        discussion_id: discussion.id,
        user_id: authContext.userId,
      });

      this.logger.log(
        `Discussion created: ${discussion.id} by user ${authContext.userId}`
      );
      return discussion;
    });
  }

  async findDiscussionsByUser(
    limit: number,
    offset: number,
    authContext: AuthContext
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const participations = await tx
        .select({ discussion_id: schema.discussion_participants.discussion_id })
        .from(schema.discussion_participants)
        .where(eq(schema.discussion_participants.user_id, authContext.userId));

      if (participations.length === 0) return [];

      const ids = participations.map((p) => p.discussion_id);

      return tx
        .select()
        .from(schema.discussions)
        .where(inArray(schema.discussions.id, ids))
        .orderBy(desc(schema.discussions.created_at))
        .limit(limit)
        .offset(offset);
    });
  }

  async findParticipantsByDiscussion(
    discussionId: string,
    authContext: AuthContext
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      await this.findDiscussionById(discussionId, authContext);

      return tx
        .select()
        .from(schema.discussion_participants)
        .where(eq(schema.discussion_participants.discussion_id, discussionId));
    });
  }

  async countParticipants(discussionId: string, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const result = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.discussion_participants)
        .where(eq(schema.discussion_participants.discussion_id, discussionId));

      return result[0]?.count || 0;
    });
  }

  async joinDiscussion(discussionId: string, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      await this.findDiscussionById(discussionId, authContext);

      const [existing] = await tx
        .select()
        .from(schema.discussion_participants)
        .where(
          and(
            eq(schema.discussion_participants.discussion_id, discussionId),
            eq(schema.discussion_participants.user_id, authContext.userId)
          )
        )
        .limit(1);

      if (existing) {
        return true;
      }

      await tx.insert(schema.discussion_participants).values({
        discussion_id: discussionId,
        user_id: authContext.userId,
      });

      this.logger.log(
        `User ${authContext.userId} joined discussion ${discussionId}`
      );
      return true;
    });
  }

  async leaveDiscussion(discussionId: string, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const discussion = await this.findDiscussionById(
        discussionId,
        authContext
      );

      if (discussion.creator_id === authContext.userId) {
        throw new ForbiddenException('Discussion creator cannot leave');
      }

      await tx
        .delete(schema.discussion_participants)
        .where(
          and(
            eq(schema.discussion_participants.discussion_id, discussionId),
            eq(schema.discussion_participants.user_id, authContext.userId)
          )
        );

      this.logger.log(
        `User ${authContext.userId} left discussion ${discussionId}`
      );
      return true;
    });
  }
}
