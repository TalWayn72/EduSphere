/**
 * LiveQAService — Q&A question lifecycle: ask, upvote, answer, dismiss.
 * Idempotent upvote via live_qa_upvotes unique constraint.
 */
import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  desc,
  withTenantContext,
  sql,
  closeAllPools,
  type Database,
  type TenantContext,
} from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { publishQAUpdated } from './nats-pubsub.helper';

const INSTRUCTOR_ROLES = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class LiveQAService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveQAService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId ?? '',
      userId: authContext.userId,
      userRole: authContext.roles?.[0] ?? 'STUDENT',
    };
  }

  async askQuestion(
    sessionId: string,
    question: string,
    authContext: AuthContext,
    streamTs?: number
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    const row = await withTenantContext(this.db, tenantCtx, async (tx) => {
      const values: Record<string, unknown> = {
        session_id: sessionId,
        user_id: authContext.userId,
        tenant_id: tenantCtx.tenantId,
        question: question.replace(/<[^>]*>/g, '').trim(),
        status: 'PENDING',
        upvotes: 0,
      };
      if (streamTs !== undefined) values['stream_ts'] = streamTs;

      const [inserted] = await tx
        .insert(schema.live_qa_questions)
        .values(values as never)
        .returning();
      return inserted;
    });

    await publishQAUpdated(sessionId, row);
    this.logger.log(`Q&A question asked: ${row.id} session=${sessionId}`);
    return row;
  }

  async upvoteQuestion(questionId: string, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.live_qa_questions)
        .where(eq(schema.live_qa_questions.id, questionId))
        .limit(1);

      if (!existing)
        throw new NotFoundException(`Question ${questionId} not found`);

      // Idempotent: insert ignore on unique constraint
      await tx
        .insert(schema.live_qa_upvotes)
        .values({
          question_id: questionId,
          user_id: authContext.userId,
          tenant_id: tenantCtx.tenantId,
        } as never)
        .onConflictDoNothing();

      // Recount from upvotes table
      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.live_qa_upvotes)
        .where(eq(schema.live_qa_upvotes.question_id, questionId));

      const newCount = countRow?.count ?? existing.upvotes;

      const [updated] = await tx
        .update(schema.live_qa_questions)
        .set({ upvotes: newCount })
        .where(eq(schema.live_qa_questions.id, questionId))
        .returning();

      await publishQAUpdated(existing.session_id, updated);
      return updated;
    });
  }

  async answerQuestion(
    questionId: string,
    answer: string,
    authContext: AuthContext
  ) {
    const role = authContext.roles?.[0] ?? 'STUDENT';
    if (!INSTRUCTOR_ROLES.includes(role)) {
      throw new ForbiddenException('Only instructors can answer questions');
    }
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.live_qa_questions)
        .where(eq(schema.live_qa_questions.id, questionId))
        .limit(1);

      if (!existing)
        throw new NotFoundException(`Question ${questionId} not found`);

      const [updated] = await tx
        .update(schema.live_qa_questions)
        .set({ status: 'ANSWERED', answer, answered_at: new Date() })
        .where(eq(schema.live_qa_questions.id, questionId))
        .returning();

      await publishQAUpdated(existing.session_id, updated);
      return updated;
    });
  }

  async dismissQuestion(questionId: string, authContext: AuthContext) {
    const role = authContext.roles?.[0] ?? 'STUDENT';
    if (!INSTRUCTOR_ROLES.includes(role)) {
      throw new ForbiddenException('Only instructors can dismiss questions');
    }
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.live_qa_questions)
        .where(eq(schema.live_qa_questions.id, questionId))
        .limit(1);

      if (!existing)
        throw new NotFoundException(`Question ${questionId} not found`);

      const [updated] = await tx
        .update(schema.live_qa_questions)
        .set({ status: 'DISMISSED' })
        .where(eq(schema.live_qa_questions.id, questionId))
        .returning();

      await publishQAUpdated(existing.session_id, updated);
      return updated;
    });
  }

  async getQuestions(
    sessionId: string,
    authContext: AuthContext,
    status?: string
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const conditions = [eq(schema.live_qa_questions.session_id, sessionId)];
      if (status) {
        conditions.push(eq(schema.live_qa_questions.status, status));
      }

      return tx
        .select()
        .from(schema.live_qa_questions)
        .where(and(...conditions))
        .orderBy(desc(schema.live_qa_questions.upvotes));
    });
  }

  async isUpvotedByUser(
    questionId: string,
    userId: string,
    tenantCtx: TenantContext
  ) {
    const result = await withTenantContext(this.db, tenantCtx, async (tx) => {
      return tx
        .select({ id: schema.live_qa_upvotes.id })
        .from(schema.live_qa_upvotes)
        .where(
          and(
            eq(schema.live_qa_upvotes.question_id, questionId),
            eq(schema.live_qa_upvotes.user_id, userId)
          )
        )
        .limit(1);
    });
    return result.length > 0;
  }
}
