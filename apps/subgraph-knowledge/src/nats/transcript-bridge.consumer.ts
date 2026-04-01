/**
 * TranscriptBridgeConsumer — listens for `transcription.completed` NATS events
 * and auto-creates a KnowledgeSource entry with source_type='TRANSCRIPT'.
 *
 * Flow:
 *   1. Receive transcription.completed event (assetId, courseId, tenantId, transcriptId)
 *   2. Read the transcript full_text from DB
 *   3. Insert a KnowledgeSource record as PENDING
 *   4. Trigger chunking + embedding pipeline via KnowledgeSourceService
 *   5. Publish extracted concepts via ConceptExtractionPublisherService
 *
 * Memory safety: implements OnModuleInit/OnModuleDestroy for NATS lifecycle.
 * SI-7: Uses buildNatsOptions() for TLS/NKey authentication.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  NatsConnection,
  StringCodec,
  JetStreamManager,
  type Subscription,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  createDatabaseConnection,
  schema,
  eq,
  closeAllPools,
} from '@edusphere/db';
import { DocumentParserService } from '../sources/document-parser.service.js';
import { EmbeddingService } from '../embedding/embedding.service.js';
import { ConceptExtractionPublisherService } from './concept-extraction-publisher.service.js';

const SUBJECT = 'transcription.completed';
const STREAM_NAME = 'TRANSCRIPTION';
const QUEUE_GROUP = 'knowledge-transcript-bridge';

interface TranscriptionCompletedPayload {
  assetId: string;
  courseId: string;
  tenantId: string;
  transcriptId: string;
  segmentCount: number;
  language: string;
}

@Injectable()
export class TranscriptBridgeConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TranscriptBridgeConsumer.name);
  private readonly sc = StringCodec();
  private connection: NatsConnection | null = null;
  private subscription: Subscription | null = null;
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly parser: DocumentParserService,
    private readonly embeddings: EmbeddingService,
    private readonly conceptPublisher: ConceptExtractionPublisherService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.connection = await connect(buildNatsOptions());
      this.logger.log('TranscriptBridgeConsumer connected to NATS');
      await this.ensureStream();
      this.startConsuming();
    } catch (err) {
      this.logger.error(
        { err },
        '[TranscriptBridgeConsumer] NATS connection failed — bridge inactive'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.connection) {
      await this.connection.drain().catch(() => undefined);
      this.connection = null;
      this.logger.log('TranscriptBridgeConsumer NATS connection drained');
    }
    await closeAllPools();
  }

  private async ensureStream(): Promise<void> {
    if (!this.connection) return;
    try {
      const jsm: JetStreamManager = await this.connection.jetstreamManager();
      try {
        await jsm.streams.info(STREAM_NAME);
      } catch {
        await jsm.streams.add({
          name: STREAM_NAME,
          subjects: ['transcription.*'],
          max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days
          max_bytes: 100 * 1024 * 1024, // 100 MB
        });
        this.logger.log(`Created NATS stream: ${STREAM_NAME}`);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Could not ensure TRANSCRIPTION stream');
    }
  }

  private startConsuming(): void {
    if (!this.connection) return;

    this.subscription = this.connection.subscribe(SUBJECT, {
      queue: QUEUE_GROUP,
    });

    this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);

    this.consumeLoop().catch((err) => {
      this.logger.error({ err }, 'TranscriptBridgeConsumer loop crashed');
    });
  }

  private async consumeLoop(): Promise<void> {
    if (!this.subscription) return;

    for await (const msg of this.subscription) {
      try {
        const raw = this.sc.decode(msg.data);
        const payload = JSON.parse(raw) as TranscriptionCompletedPayload;

        if (!payload.transcriptId || !payload.tenantId || !payload.courseId) {
          this.logger.warn(
            '[TranscriptBridgeConsumer] Invalid payload — missing required fields'
          );
          continue;
        }

        // Validate tenantId is a UUID to prevent injection via crafted NATS messages
        const uuidPattern =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(payload.tenantId)) {
          this.logger.error(
            { tenantId: payload.tenantId },
            '[TranscriptBridgeConsumer] Invalid tenantId format — rejecting'
          );
          continue;
        }

        await this.bridgeTranscript(payload);
      } catch (err) {
        this.logger.error(
          { err },
          '[TranscriptBridgeConsumer] Failed to process transcription.completed'
        );
      }
    }
  }

  private async bridgeTranscript(
    payload: TranscriptionCompletedPayload
  ): Promise<void> {
    const { transcriptId, courseId, tenantId, assetId } = payload;

    // 1. Read transcript from DB
    const [transcript] = await this.db
      .select()
      .from(schema.transcripts)
      .where(eq(schema.transcripts.id, transcriptId))
      .limit(1);

    if (!transcript) {
      this.logger.error(
        { transcriptId, tenantId },
        '[TranscriptBridgeConsumer] Transcript not found in DB — skipping'
      );
      return;
    }

    const fullText = transcript.full_text ?? '';
    if (fullText.trim().length === 0) {
      this.logger.warn(
        { transcriptId, tenantId },
        '[TranscriptBridgeConsumer] Empty transcript text — skipping'
      );
      return;
    }

    // 2. Create KnowledgeSource record
    const [source] = await this.db
      .insert(schema.knowledgeSources)
      .values({
        tenant_id: tenantId,
        course_id: courseId,
        title: `Transcript: ${assetId}`,
        source_type: 'TEXT',
        origin: `transcript:${transcriptId}`,
        status: 'PROCESSING',
        metadata: { transcript_id: transcriptId, asset_id: assetId },
      })
      .returning();

    if (!source) {
      this.logger.error(
        { transcriptId, tenantId },
        '[TranscriptBridgeConsumer] Failed to create KnowledgeSource'
      );
      return;
    }

    this.logger.log(
      { sourceId: source.id, transcriptId, tenantId },
      '[TranscriptBridgeConsumer] KnowledgeSource created — starting chunking'
    );

    // 3. Chunk + embed
    try {
      const chunks = this.parser.chunkText(fullText);
      let embeddedCount = 0;

      for (const chunk of chunks) {
        try {
          const segmentId = `ks:${source.id}:${chunk.index}`;
          await this.embeddings.generateEmbedding(chunk.text, segmentId);
          embeddedCount++;
        } catch (err) {
          this.logger.warn(
            `[TranscriptBridgeConsumer] Embedding failed for chunk ${chunk.index}: ${err}`
          );
        }
      }

      // Mark READY
      await this.db
        .update(schema.knowledgeSources)
        .set({
          status: 'READY',
          raw_content: fullText,
          chunk_count: embeddedCount,
        })
        .where(eq(schema.knowledgeSources.id, source.id));

      this.logger.log(
        { sourceId: source.id, embeddedCount, totalChunks: chunks.length },
        '[TranscriptBridgeConsumer] KnowledgeSource READY'
      );

      // 4. Publish concepts (non-blocking)
      this.conceptPublisher
        .extractAndPublish(fullText, courseId, tenantId)
        .catch((err) =>
          this.logger.error(
            { err, sourceId: source.id },
            '[TranscriptBridgeConsumer] Concept extraction failed (non-fatal)'
          )
        );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { err, sourceId: source.id },
        `[TranscriptBridgeConsumer] Processing failed: ${errorMessage}`
      );

      await this.db
        .update(schema.knowledgeSources)
        .set({ status: 'FAILED', error_message: errorMessage })
        .where(eq(schema.knowledgeSources.id, source.id));
    }
  }
}
