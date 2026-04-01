/**
 * LiveSessionsEventsService — NATS event publishing for live sessions.
 *
 * Handles all NATS event publication: session created, started, ended,
 * participant joined.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const NATS_SESSIONS_STARTED = 'EDUSPHERE.sessions.started';
const NATS_SESSIONS_CREATED = 'EDUSPHERE.sessions.created';
const NATS_SESSIONS_ENDED = 'EDUSPHERE.sessions.ended';
const NATS_SESSIONS_PARTICIPANT_JOINED =
  'EDUSPHERE.sessions.participant.joined';

@Injectable()
export class LiveSessionsEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveSessionsEventsService.name);
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;

  private async getNatsConnection(): Promise<NatsConnection> {
    if (this.natsConn) return this.natsConn;

    try {
      this.natsConn = await connect(buildNatsOptions());
      this.logger.log('[LiveSessionsEventsService] Connected to NATS');
    } catch (err) {
      this.logger.warn(
        `[LiveSessionsEventsService] NATS connection failed (non-fatal): ${String(err)}`
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
        `[LiveSessionsEventsService] Published event on ${subject}`
      );
    } catch (err) {
      this.logger.error(
        { error: err, subject },
        '[LiveSessionsEventsService] Failed to publish NATS event'
      );
    }
  }

  async publishSessionStarted(
    sessionId: string,
    tenantId: string,
    startedAt: Date
  ): Promise<void> {
    await this.publishEvent(NATS_SESSIONS_STARTED, {
      sessionId,
      tenantId,
      startedAt: startedAt.toISOString(),
    });
  }

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

  async onModuleDestroy(): Promise<void> {
    if (this.natsConn) {
      await this.natsConn.drain().catch(() => undefined);
      this.natsConn = null;
      this.logger.log('[LiveSessionsEventsService] NATS connection closed');
    }
  }
}
