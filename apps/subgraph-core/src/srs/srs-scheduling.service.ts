/**
 * SrsSchedulingService — Daily digest scheduling and NATS event publishing.
 * Extracted from SrsService to keep files under 300 lines.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const DAILY_DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SRS_REVIEW_DUE_SUBJECT = 'EDUSPHERE.srs.review.due';

@Injectable()
export class SrsSchedulingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SrsSchedulingService.name);
  private nats: NatsConnection | null = null;
  private digestIntervalHandle: ReturnType<typeof setInterval> | null = null;

  async onModuleInit(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('SrsSchedulingService: NATS connected');
    } catch (err) {
      this.logger.warn(
        { err },
        'SrsSchedulingService: NATS connection failed — digest disabled'
      );
    }
    this.scheduleDailyDigest();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.digestIntervalHandle !== null) {
      clearInterval(this.digestIntervalHandle);
      this.digestIntervalHandle = null;
    }
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
  }

  private scheduleDailyDigest(): void {
    const runDigest = () => void this.publishDailyDigest();
    this.digestIntervalHandle = setInterval(
      runDigest,
      DAILY_DIGEST_INTERVAL_MS
    );
    this.logger.log('SrsSchedulingService: daily digest scheduled (every 24h)');
  }

  private async publishDailyDigest(): Promise<void> {
    if (!this.nats) return;
    try {
      const payload = JSON.stringify({
        event: 'srs.review.due',
        timestamp: new Date().toISOString(),
      });
      this.nats.publish(
        SRS_REVIEW_DUE_SUBJECT,
        new TextEncoder().encode(payload)
      );
      this.logger.log(
        { subject: SRS_REVIEW_DUE_SUBJECT },
        'SRS daily digest published'
      );
    } catch (err) {
      this.logger.error({ err }, 'SRS daily digest publish failed');
    }
  }
}
