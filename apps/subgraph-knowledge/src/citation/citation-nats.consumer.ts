/**
 * NATS consumer for `citation.candidates.extracted` events.
 *
 * When the transcription worker publishes citation candidates, this consumer:
 * 1. Resolves each candidate against the knowledge graph
 * 2. Stores lesson_citations in the DB
 * 3. Builds enriched transcript blocks
 * 4. Publishes `lesson.enrichment.completed`
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { NatsConnection, StringCodec, JetStreamManager } from 'nats';
import { eq, and } from 'drizzle-orm';
import { db, schema, withTenantContext } from '@edusphere/db';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  CitationResolutionService,
  type CitationCandidate,
} from './citation-resolution.service';
import { EnrichedBlockBuilderService } from './enriched-block-builder.service';

const SUBJECT = 'citation.candidates.extracted';
const COMPLETED_SUBJECT = 'lesson.enrichment.completed';
const QUEUE_GROUP = 'citation-resolution-workers';
const STREAM_NAME = 'CITATION';

interface CandidatesPayload {
  lessonId: string;
  tenantId: string;
  courseId?: string;
  candidates: CitationCandidate[];
}

@Injectable()
export class CitationNatsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CitationNatsConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(
    private readonly resolutionService: CitationResolutionService,
    private readonly blockBuilder: EnrichedBlockBuilderService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const { connect } = await import('nats');
      this.connection = await connect(buildNatsOptions());
      this.logger.log('Connected to NATS for citation resolution');
      await this.ensureStream();
      await this.startConsuming();
    } catch (err) {
      this.logger.error(
        { err },
        'Failed to connect — citation resolution consumer inactive'
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
          subjects: ['citation.*'],
          max_age: 24 * 60 * 60 * 1_000_000_000,
          max_bytes: 100 * 1024 * 1024,
        });
        this.logger.log(`Created NATS stream: ${STREAM_NAME}`);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Could not ensure CITATION stream');
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
          const payload = JSON.parse(raw) as CandidatesPayload;
          await this.handleCandidates(payload);
        } catch (err) {
          this.logger.error(
            { err },
            'Failed to handle citation.candidates.extracted'
          );
        }
      }
    })().catch((err) => {
      this.logger.error(
        { err },
        'Citation resolution subscription loop crashed'
      );
    });
  }

  private async handleCandidates(
    payload: CandidatesPayload
  ): Promise<void> {
    const { lessonId, tenantId, candidates } = payload;
    this.logger.log(
      { lessonId, candidateCount: candidates.length },
      'Resolving citation candidates'
    );

    const resolved = await this.resolutionService.resolveCandidates(
      candidates,
      lessonId,
      tenantId
    );

    // Store lesson_citations in DB
    await withTenantContext(
      db,
      { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' },
      async (txDb) => {
        for (const r of resolved) {
          await txDb.insert(schema.lesson_citations).values({
            lesson_id: lessonId,
            source_text: r.candidate.originalText,
            book_name: r.candidate.bookName,
            part: r.candidate.part ?? null,
            page: r.candidate.page ?? null,
            column: r.candidate.column ?? null,
            paragraph: r.candidate.paragraph ?? null,
            match_status: r.matchStatus,
            confidence: String(r.candidate.confidence),
            knowledge_source_id: r.knowledgeSourceId ?? null,
            resolved_text: r.resolvedText ?? null,
            graph_source_id: r.graphSourceId ?? null,
          });
        }
      }
    );

    // Build enriched transcript blocks
    const blockCount = await this.blockBuilder.buildBlocks(
      lessonId,
      tenantId,
      resolved
    );

    // Publish completion event
    await this.publishCompleted({
      lessonId,
      tenantId,
      blockCount,
      citationCount: resolved.length,
    });
  }

  private async publishCompleted(payload: {
    lessonId: string;
    tenantId: string;
    blockCount: number;
    citationCount: number;
  }): Promise<void> {
    if (!this.connection) return;
    try {
      const js = this.connection.jetstream();
      const data = this.sc.encode(JSON.stringify(payload));
      await js.publish(COMPLETED_SUBJECT, data);
      this.logger.log(
        { subject: COMPLETED_SUBJECT, lessonId: payload.lessonId },
        'Published lesson.enrichment.completed'
      );
    } catch (err) {
      this.logger.error(
        { err },
        `Failed to publish to ${COMPLETED_SUBJECT}`
      );
    }
  }
}
