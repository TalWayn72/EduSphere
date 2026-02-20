import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  connect,
  NatsConnection,
  StringCodec,
  JetStreamClient,
  JetStreamManager,
} from 'nats';

/**
 * NATS JetStream service for the transcription worker.
 * Handles connection lifecycle, publishing, and subscription setup.
 */
@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private connection: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private readonly sc = StringCodec();

  async onModuleInit(): Promise<void> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    try {
      this.connection = await connect({ servers: natsUrl });
      this.js = this.connection.jetstream();
      this.logger.log(`Connected to NATS at ${natsUrl}`);
      await this.ensureStreams();
    } catch (err) {
      this.logger.error('Failed to connect to NATS', err);
      // Non-fatal on startup — worker will retry via reconnect
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.drain();
      this.logger.log('NATS connection drained and closed');
    }
  }

  /**
   * Publish a JSON payload to the given NATS subject.
   */
  async publish(subject: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.js) {
      this.logger.warn(`NATS not connected — dropping event on ${subject}`);
      return;
    }
    try {
      const data = this.sc.encode(JSON.stringify(payload));
      await this.js.publish(subject, data);
      this.logger.debug(`Published to ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to publish to ${subject}`, err);
    }
  }

  /**
   * Returns the raw NATS connection for subscription use in workers.
   */
  getConnection(): NatsConnection | null {
    return this.connection;
  }

  getStringCodec() {
    return this.sc;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async ensureStreams(): Promise<void> {
    if (!this.connection) return;
    try {
      const jsm: JetStreamManager = await this.connection.jetstreamManager();
      // Ensure MEDIA stream exists (created by content subgraph; idempotent here)
      const streams = [
        { name: 'MEDIA', subjects: ['media.*'] },
        { name: 'TRANSCRIPTION', subjects: ['transcription.*'] },
      ];
      for (const stream of streams) {
        try {
          await jsm.streams.info(stream.name);
        } catch {
          await jsm.streams.add({ name: stream.name, subjects: stream.subjects });
          this.logger.log(`Created NATS stream: ${stream.name}`);
        }
      }
    } catch (err) {
      this.logger.warn('Could not ensure NATS streams (JetStream may not be enabled)', err);
    }
  }
}
