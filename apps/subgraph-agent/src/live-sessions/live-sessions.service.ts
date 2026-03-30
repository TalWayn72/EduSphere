import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  type Database,
} from '@edusphere/db';
import { LiveSessionsEventsService } from './live-sessions-events.service';

export interface StartLiveSessionResult {
  sessionId: string;
  status: string;
  startedAt: string;
}

export interface JoinSessionResult {
  session: { id: string; status: string; tenantId: string };
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

  constructor(private readonly eventsService: LiveSessionsEventsService) {}

  private async findSession(sessionId: string, tenantId: string) {
    const [session] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(and(eq(schema.liveSessions.id, sessionId), eq(schema.liveSessions.tenantId, tenantId)))
      .limit(1);
    return session ?? null;
  }

  async startLiveSession(
    sessionId: string, tenantId: string, userId: string, userRole: string
  ): Promise<StartLiveSessionResult> {
    const allowedRoles = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException('Only instructors and admins can start a live session');
    }

    const startedAt = new Date();
    const [updated] = await this.db
      .update(schema.liveSessions)
      .set({ status: 'LIVE', startedAt })
      .where(and(eq(schema.liveSessions.id, sessionId), eq(schema.liveSessions.tenantId, tenantId)))
      .returning();

    if (!updated) {
      this.logger.error({ sessionId, tenantId }, '[LiveSessionsService] startLiveSession: session not found');
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    this.logger.log(`[LiveSessionsService] Session started sessionId=${sessionId} tenantId=${tenantId} userId=${userId}`);
    await this.eventsService.publishSessionStarted(sessionId, tenantId, startedAt);

    return { sessionId, status: 'LIVE', startedAt: startedAt.toISOString() };
  }

  async endLiveSession(
    sessionId: string, instructorId: string, tenantId: string
  ): Promise<typeof schema.liveSessions.$inferSelect> {
    const endedAt = new Date();
    const existing = await this.findSession(sessionId, tenantId);
    if (!existing) {
      this.logger.error({ sessionId, tenantId, instructorId }, '[LiveSessionsService] endLiveSession: session not found');
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    const [updated] = await this.db
      .update(schema.liveSessions)
      .set({ status: 'ENDED', endedAt })
      .where(and(eq(schema.liveSessions.id, sessionId), eq(schema.liveSessions.tenantId, tenantId)))
      .returning();

    if (!updated) throw new NotFoundException(`LiveSession ${sessionId} not found`);

    this.logger.log({ sessionId, tenantId, instructorId }, '[LiveSessionsService] endLiveSession: session ended');
    await this.eventsService.publishSessionEnded(sessionId, tenantId, endedAt, existing.startedAt);
    return updated;
  }

  async joinLiveSession(
    sessionId: string, userId: string, tenantId: string
  ): Promise<JoinSessionResult> {
    const session = await this.findSession(sessionId, tenantId);
    if (!session) {
      this.logger.error({ sessionId, tenantId, userId }, '[LiveSessionsService] joinLiveSession: session not found');
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    if (session.status !== 'LIVE') {
      this.logger.warn({ sessionId, tenantId, userId, status: session.status }, '[LiveSessionsService] joinLiveSession: session is not LIVE');
      throw new BadRequestException(`Cannot join session in status ${session.status}. Session must be LIVE.`);
    }

    this.logger.log({ sessionId, tenantId, userId }, '[LiveSessionsService] joinLiveSession: user joined');
    await this.eventsService.publishParticipantJoined(sessionId, tenantId, userId);

    return {
      session: { id: session.id, status: session.status, tenantId: session.tenantId },
      roomUrl: `https://meet.edusphere.dev/${sessionId}`,
      token: null,
    };
  }

  async cancelLiveSession(
    sessionId: string, instructorId: string, tenantId: string
  ): Promise<typeof schema.liveSessions.$inferSelect> {
    const existing = await this.findSession(sessionId, tenantId);
    if (!existing) {
      this.logger.error({ sessionId, tenantId, instructorId }, '[LiveSessionsService] cancelLiveSession: session not found');
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
      .where(and(eq(schema.liveSessions.id, sessionId), eq(schema.liveSessions.tenantId, tenantId)))
      .returning();

    if (!updated) throw new NotFoundException(`LiveSession ${sessionId} not found`);

    this.logger.log({ sessionId, tenantId, instructorId }, '[LiveSessionsService] cancelLiveSession: session cancelled');
    return updated;
  }

  async getSessionAttendees(
    sessionId: string, _instructorId: string, tenantId: string,
    _pagination: { first?: number; after?: string }
  ): Promise<SessionAttendeeConnection> {
    const existing = await this.findSession(sessionId, tenantId);
    if (!existing) {
      this.logger.error({ sessionId, tenantId }, '[LiveSessionsService] getSessionAttendees: session not found');
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    this.logger.debug({ sessionId, tenantId }, '[LiveSessionsService] getSessionAttendees: returning empty attendee list');
    return {
      edges: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      totalCount: 0,
    };
  }

  /** @deprecated Use LiveSessionsEventsService directly */
  async publishSessionCreated(sid: string, tid: string, iid: string, at: Date): Promise<void> {
    await this.eventsService.publishSessionCreated(sid, tid, iid, at);
  }

  /** @deprecated Use LiveSessionsEventsService directly */
  async publishSessionEnded(sid: string, tid: string, end: Date, start: Date | null): Promise<void> {
    await this.eventsService.publishSessionEnded(sid, tid, end, start);
  }

  /** @deprecated Use LiveSessionsEventsService directly */
  async publishParticipantJoined(sid: string, tid: string, uid: string): Promise<void> {
    await this.eventsService.publishParticipantJoined(sid, tid, uid);
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }
}
