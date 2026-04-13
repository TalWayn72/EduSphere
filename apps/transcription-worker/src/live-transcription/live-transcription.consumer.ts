/**
 * LiveTranscriptionConsumer
 *
 * NATS consumer for the live transcription pipeline.
 *
 * Subjects:
 *  - EDUSPHERE.stream.started   → initialise session, warm vocab cache
 *  - EDUSPHERE.stream.audio.chunk → push audio bytes to StreamingWhisperClient
 *  - EDUSPHERE.stream.ended     → finalize session, evict cache
 *
 * For each segment emitted by StreamingWhisperClient:
 *  1. If isFinal=true → run LiveJargonMatcher
 *  2. SegmentPublisher persists + NATS-publishes the segment (with jargon hits)
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, NatsConnection, StringCodec } from 'nats';
import { z } from 'zod';
import { StreamingWhisperClient } from './streaming-whisper.client';
import { VocabLoader } from './vocab-loader';
import { LiveJargonMatcher } from './live-jargon-matcher';
import { SegmentPublisher } from './segment-publisher';
import type {
  LiveSession,
  LiveSegment,
  StreamStartedEvent,
  AudioChunkEvent,
  StreamEndedEvent,
} from './live-transcription.types';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const StreamStartedSchema = z.object({
  sessionId: z.string(),
  lessonId: z.string(),
  tenantId: z.string(),
  language: z.string().optional().default('en'),
});

const AudioChunkSchema = z.object({
  sessionId: z.string(),
  tenantId: z.string(),
  audioBase64: z.string(),
  sequenceNumber: z.number(),
  timestampMs: z.number(),
});

const StreamEndedSchema = z.object({
  sessionId: z.string(),
  tenantId: z.string(),
});

const QUEUE_GROUP = 'live-transcription-workers';

@Injectable()
export class LiveTranscriptionConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(LiveTranscriptionConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();
  /** Active sessions keyed by sessionId */
  private readonly sessions = new Map<string, LiveSession>();

  constructor(
    private readonly streamingWhisper: StreamingWhisperClient,
    private readonly vocabLoader: VocabLoader,
    private readonly jargonMatcher: LiveJargonMatcher,
    private readonly segmentPublisher: SegmentPublisher
  ) {}

  async onModuleInit(): Promise<void> {
    const natsUrl = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    try {
      this.connection = await connect({ servers: natsUrl });
      this.logger.log('LiveTranscriptionConsumer connected to NATS');
      this.subscribe(
        'EDUSPHERE.stream.started',
        this.handleStreamStarted.bind(this)
      );
      this.subscribe(
        'EDUSPHERE.stream.audio.chunk',
        this.handleAudioChunk.bind(this)
      );
      this.subscribe(
        'EDUSPHERE.stream.ended',
        this.handleStreamEnded.bind(this)
      );
    } catch (err) {
      this.logger.error(
        { err },
        'LiveTranscriptionConsumer: NATS connection failed'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.drain();
      this.logger.log('LiveTranscriptionConsumer: NATS drained');
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  private async handleStreamStarted(raw: string): Promise<void> {
    const event = StreamStartedSchema.parse(
      JSON.parse(raw)
    ) as StreamStartedEvent & { language: string };
    const session: LiveSession = {
      sessionId: event.sessionId,
      lessonId: event.lessonId,
      tenantId: event.tenantId,
      language: event.language,
    };
    this.sessions.set(event.sessionId, session);
    this.streamingWhisper.startSession(event.sessionId);

    // Warm the vocab cache in the background
    this.vocabLoader
      .getPrompt(event.sessionId, event.lessonId, event.tenantId)
      .catch((err) =>
        this.logger.warn(
          { err, sessionId: event.sessionId },
          'Vocab warm failed'
        )
      );

    this.logger.log({ sessionId: event.sessionId }, 'Live stream started');
  }

  private async handleAudioChunk(raw: string): Promise<void> {
    const event = AudioChunkSchema.parse(JSON.parse(raw)) as AudioChunkEvent;
    const session = this.sessions.get(event.sessionId);
    if (!session) {
      this.logger.warn(
        { sessionId: event.sessionId },
        'Audio chunk for unknown session — ignored'
      );
      return;
    }

    const audioBytes = Buffer.from(event.audioBase64, 'base64');
    const vocabPrompt = await this.vocabLoader
      .getPrompt(session.sessionId, session.lessonId, session.tenantId)
      .catch(() => '');

    await this.streamingWhisper.pushChunk(
      session.sessionId,
      session.tenantId,
      audioBytes,
      (segment) => this.onSegment(session, segment),
      vocabPrompt,
      session.language
    );
  }

  private async handleStreamEnded(raw: string): Promise<void> {
    const event = StreamEndedSchema.parse(JSON.parse(raw)) as StreamEndedEvent;
    const session = this.sessions.get(event.sessionId);
    if (!session) return;

    const vocabPrompt = await this.vocabLoader
      .getPrompt(session.sessionId, session.lessonId, session.tenantId)
      .catch(() => '');

    await this.streamingWhisper.finalize(
      session.sessionId,
      session.tenantId,
      (segment) => this.onSegment(session, segment),
      vocabPrompt,
      session.language
    );

    this.vocabLoader.evict(event.sessionId);
    this.sessions.delete(event.sessionId);
    this.logger.log(
      { sessionId: event.sessionId },
      'Live stream ended — session cleaned up'
    );
  }

  // ─── Segment pipeline ─────────────────────────────────────────────────────

  private async onSegment(
    session: LiveSession,
    segment: LiveSegment
  ): Promise<void> {
    let hits = [];

    if (segment.isFinal) {
      const terms = await this.vocabLoader
        .getTerms(session.sessionId, session.lessonId, session.tenantId)
        .catch(() => []);
      hits = await this.jargonMatcher.match(segment, terms);
    }

    await this.segmentPublisher.publish(segment, hits);
  }

  // ─── Subscription helper ──────────────────────────────────────────────────

  private subscribe(
    subject: string,
    handler: (raw: string) => Promise<void>
  ): void {
    if (!this.connection) return;
    const sub = this.connection.subscribe(subject, { queue: QUEUE_GROUP });
    (async () => {
      for await (const msg of sub) {
        try {
          await handler(this.sc.decode(msg.data));
        } catch (err) {
          this.logger.error({ err, subject }, 'Message handler error');
        }
      }
    })().catch((err) =>
      this.logger.error({ err, subject }, 'Subscription loop crashed')
    );
    this.logger.log(`Subscribed to ${subject} (queue: ${QUEUE_GROUP})`);
  }
}
