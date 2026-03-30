import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID, randomBytes } from 'crypto';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  encryptField,
  decryptField,
  deriveTenantKey,
} from '@edusphere/db';
import { createBbbClient, BBB_DEMO_JOIN_URL } from './bbb.client';
import { LiveSessionRecordingService } from './live-session-recording.service';

const MODERATOR_ROLES = ['INSTRUCTOR', 'ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN'];

export interface LiveSessionResult {
  id: string;
  contentItemId: string;
  meetingName: string;
  scheduledAt: string;
  status: string;
  recordingUrl: string | null;
  participantCount: number | null;
  maxParticipants: number | null;
  instructorId: string | null;
  courseId: string | null;
}

interface DbLiveSession {
  id: string;
  contentItemId: string;
  tenantId: string;
  bbbMeetingId: string;
  meetingName: string;
  scheduledAt: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
  recordingUrl?: string | null;
  attendeePasswordEnc: string;
  moderatorPasswordEnc: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class LiveSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveSessionService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly recordingService: LiveSessionRecordingService
  ) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private map(row: DbLiveSession): LiveSessionResult {
    return {
      id: row.id,
      contentItemId: row.contentItemId,
      meetingName: row.meetingName,
      scheduledAt: row.scheduledAt.toISOString(),
      status: row.status,
      recordingUrl: row.recordingUrl ?? null,
      participantCount: null,
      maxParticipants: null,
      instructorId: null,
      courseId: null,
    };
  }

  private generatePassword(): string {
    return randomBytes(16).toString('hex');
  }

  async createLiveSession(
    contentItemId: string,
    tenantId: string,
    scheduledAt: Date,
    meetingName: string
  ): Promise<LiveSessionResult> {
    const bbbMeetingId = randomUUID();
    const attendeePassword = this.generatePassword();
    const moderatorPassword = this.generatePassword();

    const tenantKey = deriveTenantKey(tenantId);
    const attendeePasswordEnc = encryptField(attendeePassword, tenantKey);
    const moderatorPasswordEnc = encryptField(moderatorPassword, tenantKey);

    const [session] = await this.db
      .insert(schema.liveSessions)
      .values({
        contentItemId, tenantId, bbbMeetingId, meetingName, scheduledAt,
        attendeePasswordEnc, moderatorPasswordEnc, status: 'SCHEDULED',
      })
      .returning();

    if (!session) throw new InternalServerErrorException('Failed to insert live session');

    await this.recordingService.publishSessionCreated(session.id, tenantId, scheduledAt);

    const bbb = createBbbClient();
    if (bbb) {
      try {
        await bbb.createMeeting(bbbMeetingId, meetingName, attendeePassword, moderatorPassword);
        this.logger.log(`BBB meeting created: ${bbbMeetingId}`);
      } catch (err) {
        this.logger.warn(`BBB createMeeting failed (non-fatal): ${err}`);
      }
    } else {
      this.logger.debug('BBB not configured - using demo mode');
    }

    return this.map(session as DbLiveSession);
  }

  async getByContentItem(
    contentItemId: string,
    tenantId: string
  ): Promise<LiveSessionResult | null> {
    const [row] = await this.db
      .select().from(schema.liveSessions)
      .where(and(
        eq(schema.liveSessions.contentItemId, contentItemId),
        eq(schema.liveSessions.tenantId, tenantId)
      ))
      .limit(1);
    return row ? this.map(row as DbLiveSession) : null;
  }

  async getJoinUrl(
    sessionId: string,
    tenantId: string,
    userName: string,
    userRole: string
  ): Promise<string> {
    const [session] = await this.db
      .select().from(schema.liveSessions)
      .where(and(
        eq(schema.liveSessions.id, sessionId),
        eq(schema.liveSessions.tenantId, tenantId)
      ))
      .limit(1);

    if (!session) throw new NotFoundException(`LiveSession ${sessionId} not found`);

    const typedSession = session as DbLiveSession;
    if (typedSession.status === 'ENDED') throw new ForbiddenException('Session has ended');

    const isModerator = MODERATOR_ROLES.includes(userRole);
    const tenantKey = deriveTenantKey(tenantId);
    const encryptedPassword = isModerator
      ? typedSession.moderatorPasswordEnc
      : typedSession.attendeePasswordEnc;
    const password = decryptField(encryptedPassword, tenantKey);

    await this.recordingService.publishParticipantJoined(sessionId, tenantId, userName);

    const bbb = createBbbClient();
    if (!bbb) {
      this.logger.debug(`BBB not configured - returning demo join URL for session=${sessionId}`);
      return BBB_DEMO_JOIN_URL;
    }
    return bbb.buildJoinUrl(typedSession.bbbMeetingId, userName, password);
  }

  async endSession(
    sessionId: string,
    tenantId: string
  ): Promise<LiveSessionResult> {
    const [updated] = await this.db
      .update(schema.liveSessions)
      .set({ status: 'ENDED', endedAt: new Date() })
      .where(and(
        eq(schema.liveSessions.id, sessionId),
        eq(schema.liveSessions.tenantId, tenantId)
      ))
      .returning();

    if (!updated) throw new NotFoundException(`LiveSession ${sessionId} not found`);

    const typedUpdated = updated as DbLiveSession;
    const endedAt = typedUpdated.endedAt ?? new Date();
    const durationSeconds = typedUpdated.startedAt
      ? Math.round((endedAt.getTime() - typedUpdated.startedAt.getTime()) / 1000)
      : null;

    this.logger.log(`[LiveSessionService] Session ended: ${sessionId}`);

    await this.recordingService.publishSessionEnded(
      sessionId, tenantId, endedAt, typedUpdated.startedAt ?? null, durationSeconds
    );
    this.recordingService.publishLegacySessionEnded(sessionId, tenantId);

    return this.map(typedUpdated);
  }

  async listSessions(
    tenantId: string,
    status?: string,
    limit = 20,
    offset = 0
  ): Promise<LiveSessionResult[]> {
    const rows = await this.db
      .select().from(schema.liveSessions)
      .where(
        status
          ? and(
              eq(schema.liveSessions.tenantId, tenantId),
              eq(schema.liveSessions.status, status as 'SCHEDULED' | 'LIVE' | 'ENDED' | 'RECORDING' | 'CANCELLED')
            )
          : eq(schema.liveSessions.tenantId, tenantId)
      )
      .orderBy(schema.liveSessions.scheduledAt)
      .limit(limit)
      .offset(offset);
    return (rows as DbLiveSession[]).map((r) => this.map(r));
  }

  async getById(
    sessionId: string,
    tenantId: string
  ): Promise<LiveSessionResult | null> {
    const [row] = await this.db
      .select().from(schema.liveSessions)
      .where(and(
        eq(schema.liveSessions.id, sessionId),
        eq(schema.liveSessions.tenantId, tenantId)
      ))
      .limit(1);
    return row ? this.map(row as DbLiveSession) : null;
  }
}
