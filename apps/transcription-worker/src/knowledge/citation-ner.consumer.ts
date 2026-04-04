/**
 * NATS consumer for `lesson.transcript.ready` — triggers Hebrew citation NER.
 *
 * When a transcript is ready (from YouTube captions or Whisper), this consumer:
 * 1. Fetches transcript segments from the DB
 * 2. Runs HebrewCitationNerService to extract citation candidates
 * 3. Publishes `citation.candidates.extracted` for the knowledge subgraph
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { NatsConnection, StringCodec, JetStreamManager } from 'nats';
import { eq } from 'drizzle-orm';
import { db, schema, withTenantContext } from '@edusphere/db';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  HebrewCitationNerService,
  type NerSegmentInput,
} from './hebrew-citation-ner.service';
import { TranscriptReadyPayloadSchema } from './citation-ner.schemas';

const SUBJECT = 'lesson.transcript.ready';
const PUBLISH_SUBJECT = 'citation.candidates.extracted';
const QUEUE_GROUP = 'citation-ner-workers';
const STREAM_NAME = 'LESSON';

@Injectable()
export class CitationNerConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CitationNerConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(private readonly nerService: HebrewCitationNerService) {}

  async onModuleInit(): Promise<void> {
    try {
      const { connect } = await import('nats');
      this.connection = await connect(buildNatsOptions());
      this.logger.log('Connected to NATS for citation NER');
      await this.ensureStream();
      await this.startConsuming();
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to connect to NATS — citation NER consumer inactive'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.drain();
      this.logger.log('NATS connection drained');
    }
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
          subjects: ['lesson.*'],
          max_age: 7 * 24 * 3600 * 1_000_000_000,
          max_bytes: 100 * 1024 * 1024,
        });
      }
    } catch (err) {
      this.logger.warn({ err }, 'Could not ensure LESSON stream');
    }
  }

  private async startConsuming(): Promise<void> {
    if (!this.connection) return;

    const sub = this.connection.subscribe(SUBJECT, {
      queue: QUEUE_GROUP,
    });
    this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);

    (async () => {
      for await (const msg of sub) {
        try {
          const raw = this.sc.decode(msg.data);
          const payload = TranscriptReadyPayloadSchema.parse(JSON.parse(raw));
          await this.handleTranscriptReady(payload);
        } catch (err) {
          this.logger.error(
            { err },
            'Failed to handle lesson.transcript.ready for NER'
          );
        }
      }
    })().catch((err) => {
      this.logger.error({ err }, 'Citation NER subscription loop crashed');
    });
  }

  private async handleTranscriptReady(payload: {
    lessonId: string;
    transcriptId: string;
    segmentCount: number;
    tenantId: string;
    courseId?: string;
  }): Promise<void> {
    const { lessonId, transcriptId, tenantId } = payload;
    this.logger.log({ lessonId, transcriptId }, 'Running citation NER');

    // Fetch segments from DB
    const segments = await withTenantContext(
      db,
      { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
      async (txDb) => {
        return txDb
          .select()
          .from(schema.transcript_segments)
          .where(eq(schema.transcript_segments.transcript_id, transcriptId))
          .orderBy(schema.transcript_segments.start_time);
      }
    );

    const nerInput: NerSegmentInput[] = segments.map((s) => ({
      id: s.id,
      text: s.text,
      startTime: Number(s.start_time),
      endTime: Number(s.end_time),
    }));

    const candidates = await this.nerService.extractCitations(
      nerInput,
      lessonId,
      tenantId
    );

    if (candidates.length === 0) {
      this.logger.log(
        { lessonId },
        'No citation candidates found — skipping publish'
      );
      return;
    }

    await this.publishCandidates({
      lessonId,
      tenantId,
      courseId: payload.courseId,
      candidates,
    });
  }

  private async publishCandidates(payload: {
    lessonId: string;
    tenantId: string;
    courseId?: string;
    candidates: unknown[];
  }): Promise<void> {
    if (!this.connection) return;
    try {
      const js = this.connection.jetstream();
      const data = this.sc.encode(
        JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
        })
      );
      await js.publish(PUBLISH_SUBJECT, data);
      this.logger.log(
        {
          subject: PUBLISH_SUBJECT,
          lessonId: payload.lessonId,
          candidateCount: payload.candidates.length,
        },
        'Published citation.candidates.extracted'
      );
    } catch (err) {
      this.logger.error({ err }, `Failed to publish to ${PUBLISH_SUBJECT}`);
    }
  }
}
