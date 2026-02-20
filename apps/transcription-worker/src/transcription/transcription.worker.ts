import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'nats';
import type { MediaUploadedEvent } from './transcription.types';
import { TranscriptionService } from './transcription.service';
import { NatsService } from '../nats/nats.service';

const SUBJECT = 'media.uploaded';
const QUEUE_GROUP = 'transcription-workers';

/**
 * NATS consumer that listens on `media.uploaded` and delegates to
 * TranscriptionService. Uses a queue group so multiple worker instances
 * share the load without duplicate processing.
 */
@Injectable()
export class TranscriptionWorker implements OnModuleInit {
  private readonly logger = new Logger(TranscriptionWorker.name);
  private subscription: Subscription | null = null;

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly natsService: NatsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Brief delay to let NatsService finish connecting
    await new Promise((r) => setTimeout(r, 500));
    await this.startListening();
  }

  private async startListening(): Promise<void> {
    const conn = this.natsService.getConnection();
    if (!conn) {
      this.logger.warn('NATS not connected — TranscriptionWorker will not receive events');
      return;
    }

    const sc = this.natsService.getStringCodec();

    // Use core NATS subscription with queue group for competing consumers
    this.subscription = conn.subscribe(SUBJECT, { queue: QUEUE_GROUP });
    this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);

    // Process messages asynchronously
    (async () => {
      for await (const msg of this.subscription!) {
        try {
          const raw = sc.decode(msg.data);
          const event = JSON.parse(raw) as MediaUploadedEvent;
          this.logger.log(
            `Received media.uploaded: assetId=${event.assetId} fileKey=${event.fileKey}`
          );
          // Fire-and-forget; errors are handled inside transcribeFile
          this.transcriptionService.transcribeFile(event).catch((err) => {
            this.logger.error('Unhandled error in transcribeFile', err);
          });
        } catch (err) {
          this.logger.error('Failed to parse media.uploaded message', err);
        }
      }
    })().catch((err) => {
      this.logger.error('TranscriptionWorker subscription loop crashed', err);
    });
  }
}
