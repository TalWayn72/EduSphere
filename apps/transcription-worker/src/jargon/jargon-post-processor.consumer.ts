/**
 * JargonPostProcessorConsumer
 *
 * NATS consumer for `lesson.transcript.ready`.
 * Triggers the jargon detection pipeline for each completed transcript.
 *
 * Follows the pattern from CitationNerConsumer in knowledge/citation-ner.consumer.ts
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, NatsConnection, StringCodec } from 'nats';
import { z } from 'zod';
import { JargonPostProcessorService } from './jargon-post-processor.service';

const SUBJECT = 'lesson.transcript.ready';
const QUEUE_GROUP = 'jargon-post-processor-workers';

const TranscriptReadySchema = z.object({
  lessonId: z.string(),
  transcriptId: z.string(),
  tenantId: z.string(),
  segmentCount: z.number().optional(),
  courseId: z.string().optional(),
});

@Injectable()
export class JargonPostProcessorConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(JargonPostProcessorConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(
    private readonly postProcessor: JargonPostProcessorService
  ) {}

  async onModuleInit(): Promise<void> {
    const natsUrl = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    try {
      this.connection = await connect({ servers: natsUrl });
      this.logger.log('Connected to NATS for jargon post-processing');
      await this.startConsuming();
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to connect to NATS — jargon consumer inactive'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.drain();
      this.logger.log('NATS connection drained (jargon consumer)');
    }
  }

  private async startConsuming(): Promise<void> {
    if (!this.connection) return;

    const sub = this.connection.subscribe(SUBJECT, {
      queue: QUEUE_GROUP,
    });
    this.logger.log(
      `Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`
    );

    (async () => {
      for await (const msg of sub) {
        try {
          const raw = this.sc.decode(msg.data);
          const payload = TranscriptReadySchema.parse(JSON.parse(raw));
          await this.handleTranscriptReady(payload);
        } catch (err) {
          this.logger.error(
            { err },
            'Failed to handle lesson.transcript.ready for jargon'
          );
        }
      }
    })().catch((err) => {
      this.logger.error(
        { err },
        'Jargon post-processor subscription loop crashed'
      );
    });
  }

  private async handleTranscriptReady(payload: {
    lessonId: string;
    transcriptId: string;
    tenantId: string;
    segmentCount?: number;
    courseId?: string;
  }): Promise<void> {
    const { lessonId, transcriptId, tenantId } = payload;
    this.logger.log(
      { lessonId, transcriptId },
      'Starting jargon post-processing'
    );

    const result = await this.postProcessor.process(
      lessonId,
      transcriptId,
      tenantId
    );

    this.logger.log(
      {
        lessonId,
        domainCount: result.domainCount,
        occurrenceCount: result.occurrenceCount,
        correctedSegmentCount: result.correctedSegmentCount,
      },
      'Jargon post-processing complete'
    );
  }
}
