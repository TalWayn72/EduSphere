import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
} from 'nats';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  type Database,
} from '@edusphere/db';

const NATS_SESSIONS_STARTED = 'EDUSPHERE.sessions.started';
const NATS_SESSIONS_CREATED = 'EDUSPHERE.sessions.created';
const NATS_SESSIONS_ENDED = 'EDUSPHERE.sessions.ended';
const NATS_SESSIONS_PARTICIPANT_JOINED = 'EDUSPHERE.sessions.participant.joined';

export interface StartLiveSessionResult {
  sessionId: string;
  status: string;
  startedAt: string;
}

@Injectable()
export class LiveSessionsService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveSessionsService.name);
  private readonly db: Database = createDatabaseConnection();
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;

  // ── NATS ──────────────────────────────────────────────────────────────────

  private async getNatsConnection(): Promise<NatsConnection> {
    if (this.natsConn) return this.natsConn;
    const url = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    try {
      this.natsConn = await connect({ servers: url });
      this.logger.log('[LiveSessionsService] Connected to NATS');
    } catch (err) {
      this.logger.warn(
        `[LiveSessionsService] NATS connection failed (non-fatal): ${String(err)}`
      );
      throw err;
    }
    return this.natsConn;
  }

  private async publishEvent(subject: string, payload: object): Promise<void> {
    try {
      const nc = await this.getNatsConnection();
      nc.publish(subject, this.sc.encode(JSON.stringify(payload)));
      this.logger.debug(
        `[LiveSessionsService] Published event on ${subject}`
      );
    } catch (err) {
      this.logger.error(
        { error: err, subject },
        '[LiveSessionsService] Failed to publish NATS event'
      );
    }
  }

  // ── Start session ─────────────────────────────────────────────────────────

  /**
   * Transitions a SCHEDULED live session to LIVE status.
   * Publishes EDUSPHERE.sessions.started event.
   * Only an INSTRUCTOR, ORG_ADMIN, or SUPER_ADMIN may start a session.
   */
  async startLiveSession(
    sessionId: string,
    tenantId: string,
    userId: string,
    userRole: string
  ): Promise<StartLiveSessionResult> {
    const allowedRoles = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        'Only instructors and admins can start a live session'
      );
    }

    const startedAt = new Date();

    const [updated] = await this.db
      .update(schema.liveSessions)
      .set({ status: 'LIVE', startedAt })
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      this.logger.error(
        { sessionId, tenantId },
        '[LiveSessionsService] startLiveSession: session not found'
      );
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    this.logger.log(
      `[LiveSessionsService] Session started sessionId=${sessionId} tenantId=${tenantId} userId=${userId}`
    );

    await this.publishEvent(NATS_SESSIONS_STARTED, {
      sessionId,
      tenantId,
      startedAt: startedAt.toISOString(),
    });

    return {
      sessionId,
      status: 'LIVE',
      startedAt: startedAt.toISOString(),
    };
  }

  // ── Publish helpers (called from content subgraph events via NATS) ─────────

  async publishSessionCreated(
    sessionId: string,
    tenantId: string,
    instructorId: string,
    scheduledAt: Date
  ): Promise<void> {
    await this.publishEvent(NATS_SESSIONS_CREATED, {
      sessionId,
      tenantId,
      instructorId,
      scheduledAt: scheduledAt.toISOString(),
    });
  }

  async publishSessionEnded(
    sessionId: string,
    tenantId: string,
    endedAt: Date,
    startedAt: Date | null
  ): Promise<void> {
    const durationSeconds =
      startedAt !== null
        ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
        : null;

    await this.publishEvent(NATS_SESSIONS_ENDED, {
      sessionId,
      tenantId,
      endedAt: endedAt.toISOString(),
      durationSeconds,
    });
  }

  async publishParticipantJoined(
    sessionId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.publishEvent(NATS_SESSIONS_PARTICIPANT_JOINED, {
      sessionId,
      tenantId,
      userId,
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    if (this.natsConn) {
      await this.natsConn.drain().catch(() => undefined);
      this.natsConn = null;
      this.logger.log('[LiveSessionsService] NATS connection closed');
    }
    await closeAllPools();
  }
}
