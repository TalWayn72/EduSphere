/**
 * LiveSessionRecordingService — Recording processing and NATS subscription.
 *
 * Handles the session-ended NATS subscription, recording retrieval from
 * BBB, and recording URL persistence.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
} from '@edusphere/db';
import { createBbbClient } from './bbb.client';

const NATS_SUBJECT = 'EDUSPHERE.live.session.ended';
const NATS_SESSION_CREATED = 'EDUSPHERE.sessions.created';
const NATS_SESSION_ENDED = 'EDUSPHERE.sessions.ended';
const NATS_PARTICIPANT_JOINED = 'EDUSPHERE.sessions.participant.joined';

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
export class LiveSessionRecordingService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveSessionRecordingService.name);
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

  async publishNatsEvent(subject: string, payload: object): Promise<void> {
    try {
      if (!this.natsConn) {
        this.natsConn = await connect(buildNatsOptions());
      }
      this.natsConn.publish(subject, this.sc.encode(JSON.stringify(payload)));
      this.logger.debug(`[LiveSessionRecordingService] Published ${subject}`);
    } catch (err) {
      this.logger.warn(
        `[LiveSessionRecordingService] NATS publish failed (non-fatal): ${err}`
      );
    }
  }

  async publishSessionCreated(
    sessionId: string,
    tenantId: string,
    scheduledAt: Date
  ): Promise<void> {
    await this.publishNatsEvent(NATS_SESSION_CREATED, {
      sessionId,
      tenantId,
      scheduledAt: scheduledAt.toISOString(),
    });
  }

  async publishSessionEnded(
    sessionId: string,
    tenantId: string,
    endedAt: Date,
    startedAt: Date | null,
    durationSeconds: number | null
  ): Promise<void> {
    await this.publishNatsEvent(NATS_SESSION_ENDED, {
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
    await this.publishNatsEvent(NATS_PARTICIPANT_JOINED, {
      sessionId,
      tenantId,
      userId,
    });
  }

  /** Publish the legacy NATS subject that triggers recording processing. */
  publishLegacySessionEnded(sessionId: string, tenantId: string): void {
    this.natsConn?.publish(
      NATS_SUBJECT,
      this.sc.encode(JSON.stringify({ sessionId, tenantId }))
    );
  }

  async processRecording(sessionId: string, tenantId: string): Promise<void> {
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

    if (!session) return;

    const typedSession = session as DbLiveSession;

    await this.db
      .update(schema.liveSessions)
      .set({ status: 'RECORDING' })
      .where(eq(schema.liveSessions.id, sessionId));

    const bbb = createBbbClient();
    if (!bbb) return;

    const recordingUrl = await bbb.getRecordingUrl(typedSession.bbbMeetingId);
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
            this.logger.log(
              `NATS: session ended - sessionId=${payload.sessionId}`
            );
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
