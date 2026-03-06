import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type ConnectionOptions,
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

export interface JoinSessionResult {
  session: {
    id: string;
    status: string;
    tenantId: string;
  };
  roomUrl: string;
  token: string | null;
}

export interface SessionAttendeeConnection {
  edges: SessionAttendeeEdge[];
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null };
  totalCount: number;
}

export interface SessionAttendeeEdge {
  node: { userId: string; joinedAt: string; role: string };
  cursor: string;
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

    // SI-7: use TLS + credentials when env vars are present (production).
    // Falls back to plain connection in local dev (no env vars set).
    const opts: ConnectionOptions = { servers: url };
    const natsUser = process.env['NATS_USERNAME'];
    const natsPass = process.env['NATS_PASSWORD'];
    const natsTlsCa = process.env['NATS_TLS_CA_FILE'];
    if (natsUser && natsPass) {
      opts.user = natsUser;
      opts.pass = natsPass;
    }
    if (natsTlsCa) {
      opts.tls = { caFile: natsTlsCa };
    }

    try {
      this.natsConn = await connect(opts);
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

  // ── End session ───────────────────────────────────────────────────────────

  async endLiveSession(
    sessionId: string,
    instructorId: string,
    tenantId: string
  ): Promise<typeof schema.liveSessions.$inferSelect> {
    const endedAt = new Date();

    const [existing] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      this.logger.error(
        { sessionId, tenantId, instructorId },
        '[LiveSessionsService] endLiveSession: session not found'
      );
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    const [updated] = await this.db
      .update(schema.liveSessions)
      .set({ status: 'ENDED', endedAt })
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    this.logger.log(
      { sessionId, tenantId, instructorId },
      '[LiveSessionsService] endLiveSession: session ended'
    );

    await this.publishSessionEnded(sessionId, tenantId, endedAt, existing.startedAt);

    return updated;
  }

  // ── Join session ──────────────────────────────────────────────────────────

  async joinLiveSession(
    sessionId: string,
    userId: string,
    tenantId: string
  ): Promise<JoinSessionResult> {
    const [session] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!session) {
      this.logger.error(
        { sessionId, tenantId, userId },
        '[LiveSessionsService] joinLiveSession: session not found'
      );
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    if (session.status !== 'LIVE') {
      this.logger.warn(
        { sessionId, tenantId, userId, status: session.status },
        '[LiveSessionsService] joinLiveSession: session is not LIVE'
      );
      throw new BadRequestException(
        `Cannot join session in status ${session.status}. Session must be LIVE.`
      );
    }

    this.logger.log(
      { sessionId, tenantId, userId },
      '[LiveSessionsService] joinLiveSession: user joined'
    );

    await this.publishParticipantJoined(sessionId, tenantId, userId);

    return {
      session: {
        id: session.id,
        status: session.status,
        tenantId: session.tenantId,
      },
      roomUrl: `https://meet.edusphere.dev/${sessionId}`,
      token: null,
    };
  }

  // ── Cancel session ────────────────────────────────────────────────────────

  async cancelLiveSession(
    sessionId: string,
    instructorId: string,
    tenantId: string
  ): Promise<typeof schema.liveSessions.$inferSelect> {
    const [existing] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      this.logger.error(
        { sessionId, tenantId, instructorId },
        '[LiveSessionsService] cancelLiveSession: session not found'
      );
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    if (existing.status !== 'SCHEDULED') {
      this.logger.warn(
        { sessionId, tenantId, instructorId, status: existing.status },
        '[LiveSessionsService] cancelLiveSession: can only cancel SCHEDULED sessions'
      );
      throw new BadRequestException(
        `Cannot cancel session in status ${existing.status}. Only SCHEDULED sessions can be cancelled.`
      );
    }

    const [updated] = await this.db
      .update(schema.liveSessions)
      .set({ status: 'CANCELLED' })
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    this.logger.log(
      { sessionId, tenantId, instructorId },
      '[LiveSessionsService] cancelLiveSession: session cancelled'
    );

    return updated;
  }

  // ── Session attendees ─────────────────────────────────────────────────────

  async getSessionAttendees(
    sessionId: string,
    _instructorId: string,
    tenantId: string,
    _pagination: { first?: number; after?: string }
  ): Promise<SessionAttendeeConnection> {
    const [existing] = await this.db
      .select({ id: schema.liveSessions.id })
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      this.logger.error(
        { sessionId, tenantId },
        '[LiveSessionsService] getSessionAttendees: session not found'
      );
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    this.logger.debug(
      { sessionId, tenantId },
      '[LiveSessionsService] getSessionAttendees: returning empty attendee list'
    );

    return {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 0,
    };
  }

  // ── Publish helpers ────────────────────────────────────────────────────────

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
