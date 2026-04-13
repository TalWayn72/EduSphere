/**
 * LiveChatService — Chat message CRUD with NATS pub and RLS tenant isolation.
 * Handles send, pin, delete, and paginated fetch for live session chat.
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
  lt,
  withTenantContext,
  closeAllPools,
  type Database,
  type TenantContext,
} from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, LiveChatSubjects } from '@edusphere/nats-client';

const sc = StringCodec();
let natsConn: NatsConnection | null = null;
let natsReady = false;

const log = new Logger('LiveChatNats');

async function getNats(): Promise<NatsConnection | null> {
  if (natsReady && natsConn) return natsConn;
  if (!process.env['NATS_URL']) return null;
  try {
    natsConn = await connect(buildNatsOptions());
    natsReady = true;
    log.log(`NATS connected: ${process.env['NATS_URL']}`);
    return natsConn;
  } catch (err) {
    log.warn(`NATS unavailable: ${String(err)}`);
    return null;
  }
}

async function natsPublish(subject: string, payload: unknown): Promise<void> {
  const nc = await getNats();
  if (!nc) return;
  try {
    nc.publish(subject, sc.encode(JSON.stringify(payload)));
  } catch (err) {
    log.warn(`NATS publish failed [${subject}]: ${String(err)}`);
  }
}

const INSTRUCTOR_ROLES = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class LiveChatService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveChatService.name);
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

  async sendMessage(
    sessionId: string,
    content: string,
    authContext: AuthContext,
    replyToId?: string
  ) {
    const sanitized = content.replace(/<[^>]*>/g, '').trim();
    const tenantCtx = this.toTenantContext(authContext);

    const message = await withTenantContext(this.db, tenantCtx, async (tx) => {
      const values: Record<string, unknown> = {
        session_id: sessionId,
        user_id: authContext.userId,
        tenant_id: tenantCtx.tenantId,
        content: sanitized,
        message_type: 'TEXT',
      };
      if (replyToId) values['reply_to_id'] = replyToId;

      const [row] = await tx
        .insert(schema.live_chat_messages)
        .values(values as never)
        .returning();
      return row;
    });

    await natsPublish(LiveChatSubjects.CHAT_MESSAGE, {
      sessionId,
      tenantId: tenantCtx.tenantId,
      messageId: message.id,
      userId: authContext.userId,
      text: sanitized,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Chat message sent: ${message.id} in session ${sessionId}`);
    return message;
  }

  async pinMessage(messageId: string, authContext: AuthContext) {
    const role = authContext.roles?.[0] ?? 'STUDENT';
    if (!INSTRUCTOR_ROLES.includes(role)) {
      throw new ForbiddenException('Only instructors can pin messages');
    }
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.live_chat_messages)
        .where(eq(schema.live_chat_messages.id, messageId))
        .limit(1);

      if (!existing) throw new NotFoundException(`Message ${messageId} not found`);

      const [updated] = await tx
        .update(schema.live_chat_messages)
        .set({ is_pinned: true })
        .where(eq(schema.live_chat_messages.id, messageId))
        .returning();

      await natsPublish(LiveChatSubjects.CHAT_PIN, {
        sessionId: updated.session_id,
        tenantId: tenantCtx.tenantId,
        messageId,
        pinnedBy: authContext.userId,
        timestamp: new Date().toISOString(),
      });

      return updated;
    });
  }

  async deleteMessage(messageId: string, authContext: AuthContext) {
    const role = authContext.roles?.[0] ?? 'STUDENT';
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.live_chat_messages)
        .where(eq(schema.live_chat_messages.id, messageId))
        .limit(1);

      if (!existing) throw new NotFoundException(`Message ${messageId} not found`);

      const isOwner = existing.user_id === authContext.userId;
      const isInstructor = INSTRUCTOR_ROLES.includes(role);
      if (!isOwner && !isInstructor) {
        throw new ForbiddenException('Cannot delete this message');
      }

      await tx
        .update(schema.live_chat_messages)
        .set({ is_deleted: true })
        .where(eq(schema.live_chat_messages.id, messageId));

      await natsPublish(LiveChatSubjects.CHAT_DELETE, {
        sessionId: existing.session_id,
        tenantId: tenantCtx.tenantId,
        messageId,
        deletedBy: authContext.userId,
        timestamp: new Date().toISOString(),
      });

      return true;
    });
  }

  async getMessages(
    sessionId: string,
    limit: number = 50,
    authContext: AuthContext,
    beforeCursor?: string
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const conditions = [
        eq(schema.live_chat_messages.session_id, sessionId),
        eq(schema.live_chat_messages.is_deleted, false),
      ];

      if (beforeCursor) {
        const beforeDate = new Date(beforeCursor);
        if (!isNaN(beforeDate.getTime())) {
          conditions.push(
            lt(schema.live_chat_messages.created_at, beforeDate)
          );
        }
      }

      return tx
        .select()
        .from(schema.live_chat_messages)
        .where(and(...conditions))
        .orderBy(desc(schema.live_chat_messages.created_at))
        .limit(limit);
    });
  }
}
