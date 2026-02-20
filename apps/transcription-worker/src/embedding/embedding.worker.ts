import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'nats';
import { createDatabaseConnection, schema, inArray, sql } from '@edusphere/db';
import { NatsService } from '../nats/nats.service';
import { embed } from './ollama.client';

const SUBJECT = 'transcription.embedding.requested';
const QUEUE_GROUP = 'embedding-workers';
const BATCH_SIZE = 20;

export interface EmbeddingRequestedEvent {
  transcriptId: string;
  segmentIds: string[];
  tenantId: string;
}

/**
 * NATS consumer for `transcription.embedding.requested`.
 *
 * For each message:
 *   1. Load transcript segments by IDs from DB
 *   2. Embed each segment text via Ollama / OpenAI (batches of 20)
 *   3. Upsert into content_embeddings table (segment_id → vector)
 */
@Injectable()
export class EmbeddingWorker implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingWorker.name);
  private readonly db = createDatabaseConnection();
  private subscription: Subscription | null = null;

  constructor(private readonly natsService: NatsService) {}

  async onModuleInit(): Promise<void> {
    await new Promise((r) => setTimeout(r, 600));
    await this.startListening();
  }

  private async startListening(): Promise<void> {
    const conn = this.natsService.getConnection();
    if (!conn) {
      this.logger.warn(
        'NATS not connected — EmbeddingWorker will not receive events'
      );
      return;
    }

    const sc = this.natsService.getStringCodec();
    this.subscription = conn.subscribe(SUBJECT, { queue: QUEUE_GROUP });
    this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);

    (async () => {
      for await (const msg of this.subscription!) {
        try {
          const raw = sc.decode(msg.data);
          const event = JSON.parse(raw) as EmbeddingRequestedEvent;
          this.logger.log(
            `Received embedding request: transcriptId=${event.transcriptId} segments=${event.segmentIds.length}`
          );
          await this.processEmbeddings(event);
        } catch (err) {
          this.logger.error(
            'Failed to process embedding.requested message',
            err
          );
        }
      }
    })().catch((err) => {
      this.logger.error('EmbeddingWorker subscription loop crashed', err);
    });
  }

  private async processEmbeddings(
    event: EmbeddingRequestedEvent
  ): Promise<void> {
    const { segmentIds, transcriptId } = event;

    if (segmentIds.length === 0) return;

    // Load segments
    const segments = await this.db
      .select({
        id: schema.transcript_segments.id,
        text: schema.transcript_segments.text,
      })
      .from(schema.transcript_segments)
      .where(inArray(schema.transcript_segments.id, segmentIds));

    if (segments.length === 0) {
      this.logger.warn(`No segments found for transcriptId=${transcriptId}`);
      return;
    }

    let embedded = 0;

    // Process in batches
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (seg) => {
          try {
            const vector = await embed(seg.text);
            const vectorString = `[${vector.join(',')}]`;
            // Upsert into content_embeddings keyed by segment_id
            await this.db.execute(sql`
              INSERT INTO content_embeddings (segment_id, embedding)
              VALUES (${seg.id}, ${vectorString}::vector)
              ON CONFLICT (segment_id)
              DO UPDATE SET embedding = EXCLUDED.embedding
            `);
            embedded++;
          } catch (err) {
            this.logger.error(
              `Failed to embed segment ${seg.id}: ${String(err)}`
            );
          }
        })
      );
    }

    this.logger.log(
      `Embedded ${embedded}/${segments.length} segments for transcript=${transcriptId}`
    );
  }
}
