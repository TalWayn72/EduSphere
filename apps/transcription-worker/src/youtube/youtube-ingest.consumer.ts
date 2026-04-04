/**
 * NATS consumer for `lesson.youtube.ingest` events.
 *
 * When a content subgraph publishes a YouTube ingest request, this consumer:
 * 1. Extracts captions via YouTubeTranscriptService
 * 2. Stores transcript + segments in the DB
 * 3. Publishes `lesson.transcript.ready` on completion
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { NatsConnection, StringCodec, JetStreamManager } from 'nats';
import { eq } from 'drizzle-orm';
import { db, schema, withBypassRLS } from '@edusphere/db';
import { randomUUID } from 'crypto';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  YouTubeTranscriptService,
  IngestPayloadSchema,
} from './youtube-transcript.service';

const SUBJECT = 'lesson.youtube.ingest';
const READY_SUBJECT = 'lesson.transcript.ready';
const QUEUE_GROUP = 'youtube-ingest-workers';
const STREAM_NAME = 'LESSON';

@Injectable()
export class YouTubeIngestConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YouTubeIngestConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(
    private readonly transcriptService: YouTubeTranscriptService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const { connect } = await import('nats');
      this.connection = await connect(buildNatsOptions());
      this.logger.log('Connected to NATS for YouTube ingest');
      await this.ensureStream();
      await this.startConsuming();
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to connect to NATS — YouTube ingest consumer inactive'
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
      const jsm: JetStreamManager =
        await this.connection.jetstreamManager();
      try {
        await jsm.streams.info(STREAM_NAME);
      } catch {
        await jsm.streams.add({
          name: STREAM_NAME,
          subjects: ['lesson.*'],
          max_age: 7 * 24 * 3600 * 1_000_000_000,
          max_bytes: 100 * 1024 * 1024,
        });
        this.logger.log(`Created NATS stream: ${STREAM_NAME}`);
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
          const payload = IngestPayloadSchema.parse(JSON.parse(raw));
          await this.handleIngest(payload);
        } catch (err) {
          this.logger.error(
            { err },
            'Failed to handle lesson.youtube.ingest message'
          );
        }
      }
    })().catch((err) => {
      this.logger.error({ err }, 'YouTube ingest subscription loop crashed');
    });
  }

  private async handleIngest(payload: {
    lessonId: string;
    youtubeUrl: string;
    tenantId: string;
    courseId: string;
  }): Promise<void> {
    const { lessonId, youtubeUrl, tenantId, courseId } = payload;
    this.logger.log({ lessonId, youtubeUrl }, 'Processing YouTube ingest');

    const videoId = this.transcriptService.extractVideoId(youtubeUrl);
    const result = await this.transcriptService.fetchTranscript(videoId);

    if (result.segments.length === 0) {
      this.logger.warn(
        { videoId, lessonId },
        'No captions found — Whisper fallback should be triggered'
      );
      return;
    }

    // Store transcript + segments via Drizzle (transcripts table uses asset_id FK,
    // not tenant_id; use a synthetic UUID representing this YouTube asset)
    const syntheticAssetId = randomUUID();
    const transcriptId = await withBypassRLS(db, async (txDb) => {
      const [transcript] = await txDb
        .insert(schema.transcripts)
        .values({
          asset_id: syntheticAssetId,
          language: result.language,
          full_text: result.segments.map((s) => s.text).join(' '),
        })
        .returning({ id: schema.transcripts.id });

      const segmentValues = result.segments.map((seg) => ({
        transcript_id: transcript.id,
        text: seg.text,
        start_time: String(seg.startTime),
        end_time: String(seg.endTime),
        speaker: null as string | null,
      }));

      await txDb.insert(schema.transcript_segments).values(segmentValues);

      return transcript.id;
    });

    this.logger.log(
      {
        lessonId,
        transcriptId,
        segmentCount: result.segments.length,
      },
      'YouTube transcript stored successfully'
    );

    await this.publishTranscriptReady({
      lessonId,
      transcriptId,
      segmentCount: result.segments.length,
      tenantId,
      courseId,
    });
  }

  private async publishTranscriptReady(payload: {
    lessonId: string;
    transcriptId: string;
    segmentCount: number;
    tenantId: string;
    courseId: string;
  }): Promise<void> {
    if (!this.connection) return;
    try {
      const js = this.connection.jetstream();
      const data = this.sc.encode(JSON.stringify(payload));
      await js.publish(READY_SUBJECT, data);
      this.logger.log(
        { subject: READY_SUBJECT, lessonId: payload.lessonId },
        'Published lesson.transcript.ready'
      );
    } catch (err) {
      this.logger.error(
        { err },
        `Failed to publish to ${READY_SUBJECT}`
      );
    }
  }
}
