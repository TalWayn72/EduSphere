import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID, randomBytes } from 'crypto';
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
} from '@edusphere/db';
import { createBbbClient, BBB_DEMO_JOIN_URL } from './bbb.client';
import type { LiveSession } from '@edusphere/db';

const NATS_SUBJECT = 'EDUSPHERE.live.session.ended';

export interface LiveSessionResult {
  id: string;
  contentItemId: string;
  meetingName: string;
  scheduledAt: string;
  status: string;
  recordingUrl: string | null;
}

@Injectable()
export class LiveSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveSessionService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;
  private natsSub: Subscription | null = null;

  constructor() {
    void this.subscribeToSessionEnded();
  }

  async onModuleDestroy(): Promise<void> {
    this.natsSub?.unsubscribe();
    if (this.natsConn) {
      await this.natsConn.drain().catch(() => undefined);
      this.natsConn = null;
    }
    await closeAllPools();
  }

  private map(row: LiveSession): LiveSessionResult {
    return {
      id: row.id,
      contentItemId: row.contentItemId,
      meetingName: row.meetingName,
      scheduledAt: row.scheduledAt.toISOString(),
      status: row.status,
      recordingUrl: row.recordingUrl ?? null,
    };
  }

  private generatePassword(): string {
    return randomBytes(16).toString('hex');
  }

  async createLiveSession(
    contentItemId: string,
    tenantId: string,
    scheduledAt: Date,
    meetingName: string,
  ): Promise<LiveSessionResult> {
    const bbbMeetingId = randomUUID();
    const attendeePassword = this.generatePassword();
    const moderatorPassword = this.generatePassword();

    const [session] = await this.db
      .insert(schema.liveSessions)
      .values({
        contentItemId,
        tenantId,
        bbbMeetingId,
        meetingName,
        scheduledAt,
        attendeePassword,
        moderatorPassword,
        status: 'SCHEDULED',
      })
      .returning();

    if (!session) throw new Error('Failed to insert live session');

    const bbb = createBbbClient();
    if (bbb) {
      try {
        await bbb.createMeeting(bbbMeetingId, meetingName, attendeePassword, moderatorPassword);
        this.logger.log(`BBB meeting created: ${bbbMeetingId}`);
      } catch (err) {
        this.logger.warn(`BBB createMeeting failed (non-fatal): ${err}`);
      }
    } else {
      this.logger.debug('BBB not configured — using demo mode');
    }

    return this.map(session);
  }

  async getByContentItem(contentItemId: string, tenantId: string): Promise<LiveSessionResult | null> {
    const [row] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.contentItemId, contentItemId),
          eq(schema.liveSessions.tenantId, tenantId),
        ),
      )
      .limit(1);

    return row ? this.map(row) : null;
  }

  async getJoinUrl(
    sessionId: string,
    tenantId: string,
    userName: string,
    userRole: string,
  ): Promise<string> {
    const [session] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException(`LiveSession ${sessionId} not found`);
    if (session.status === 'ENDED') throw new ForbiddenException('Session has ended');

    const isModerator = ['INSTRUCTOR', 'ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const password = isModerator ? session.moderatorPassword : session.attendeePassword;

    const bbb = createBbbClient();
    if (!bbb) {
      this.logger.debug(`BBB not configured — returning demo join URL for session=${sessionId}`);
      return BBB_DEMO_JOIN_URL;
    }

    return bbb.buildJoinUrl(session.bbbMeetingId, userName, password);
  }

  async endSession(sessionId: string, tenantId: string): Promise<LiveSessionResult> {
    const [updated] = await this.db
      .update(schema.liveSessions)
      .set({ status: 'ENDED', endedAt: new Date() })
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException(`LiveSession ${sessionId} not found`);
    this.logger.log(`Session ended: ${sessionId}`);
    return this.map(updated);
  }

  async processRecording(sessionId: string, tenantId: string): Promise<void> {
    const [session] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!session) return;

    await this.db
      .update(schema.liveSessions)
      .set({ status: 'RECORDING' })
      .where(eq(schema.liveSessions.id, sessionId));

    const bbb = createBbbClient();
    if (!bbb) return;

    const recordingUrl = await bbb.getRecordingUrl(session.bbbMeetingId);
    if (recordingUrl) {
      await this.db
        .update(schema.liveSessions)
        .set({ recordingUrl, status: 'ENDED' })
        .where(eq(schema.liveSessions.id, sessionId));
      this.logger.log(`Recording saved for session=${sessionId}`);
    }
  }

  private async subscribeToSessionEnded(): Promise<void> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    try {
      this.natsConn = await connect({ servers: natsUrl });
      this.natsSub = this.natsConn.subscribe(NATS_SUBJECT);

      void (async () => {
        if (!this.natsSub) return;
        for await (const msg of this.natsSub) {
          try {
            const payload = JSON.parse(this.sc.decode(msg.data)) as {
              sessionId: string;
              tenantId: string;
            };
            this.logger.log(`NATS: session ended — sessionId=${payload.sessionId}`);
            await this.processRecording(payload.sessionId, payload.tenantId);
          } catch (err) {
            this.logger.error('Error processing session.ended event', err);
          }
        }
      })();

      this.logger.log(`Subscribed to ${NATS_SUBJECT}`);
    } catch (err) {
      this.logger.warn(`NATS subscription failed (non-fatal): ${err}`);
    }
  }
}
