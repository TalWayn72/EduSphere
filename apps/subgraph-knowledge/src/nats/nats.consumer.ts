import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  connect,
  NatsConnection,
  StringCodec,
  JetStreamManager,
} from 'nats';
import { CypherService } from '../graph/cypher.service';
import type { ExtractedConcept } from './nats.types';

const SUBJECT = 'knowledge.concepts.extracted';
const PERSIST_SUBJECT = 'knowledge.concepts.persisted';
const QUEUE_GROUP = 'knowledge-workers';
const STREAM_NAME = 'KNOWLEDGE';

/**
 * Subscribes to `knowledge.concepts.extracted` NATS events published by the
 * transcription worker and persists each concept into Apache AGE via CypherService.
 *
 * Idempotency: case-insensitive name match prevents duplicate nodes.
 */
@Injectable()
export class NatsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsConsumer.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  constructor(private readonly cypherService: CypherService) {}

  async onModuleInit(): Promise<void> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    try {
      this.connection = await connect({ servers: natsUrl });
      this.logger.log(`Connected to NATS at ${natsUrl}`);
      await this.ensureStream();
      await this.startConsuming();
    } catch (err) {
      this.logger.error({ err }, 'Failed to connect to NATS — knowledge consumer inactive');
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
          subjects: ['knowledge.*'],
        });
        this.logger.log(`Created NATS stream: ${STREAM_NAME}`);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Could not ensure KNOWLEDGE stream');
    }
  }

  private async startConsuming(): Promise<void> {
    if (!this.connection) return;

    const sub = this.connection.subscribe(SUBJECT, { queue: QUEUE_GROUP });
    this.logger.log(`Subscribed to ${SUBJECT} (queue: ${QUEUE_GROUP})`);

    (async () => {
      for await (const msg of sub) {
        try {
          const raw = this.sc.decode(msg.data);
          const payload = JSON.parse(raw) as {
            concepts: ExtractedConcept[];
            courseId: string;
            tenantId: string;
          };
          await this.processConcepts(payload);
        } catch (err) {
          this.logger.error({ err }, 'Failed to handle knowledge.concepts.extracted message');
        }
      }
    })().catch((err) => {
      this.logger.error({ err }, 'NatsConsumer subscription loop crashed');
    });
  }

  private async processConcepts(payload: {
    concepts: ExtractedConcept[];
    courseId: string;
    tenantId: string;
  }): Promise<void> {
    const { concepts, courseId, tenantId } = payload;
    let persisted = 0;

    for (const concept of concepts) {
      try {
        await this.upsertConcept(concept, courseId, tenantId);
        persisted++;
      } catch (err) {
        this.logger.error(
          { err, conceptName: concept.name, tenantId },
          'Failed to upsert concept — continuing'
        );
      }
    }

    // Create RELATED_TO edges between concepts and their related terms
    for (const concept of concepts) {
      for (const relatedTerm of concept.relatedTerms) {
        try {
          await this.cypherService.linkConceptsByName(
            concept.name,
            relatedTerm,
            tenantId,
            0.7
          );
        } catch (err) {
          this.logger.debug(
            { err, from: concept.name, to: relatedTerm },
            'linkConceptsByName skipped (node may not exist yet)'
          );
        }
      }
    }

    this.logger.log(
      { courseId, tenantId, persisted, total: concepts.length },
      'Concept persistence complete'
    );

    await this.publishPersisted(courseId, tenantId, persisted);
  }

  private async upsertConcept(
    concept: ExtractedConcept,
    courseId: string,
    tenantId: string
  ): Promise<void> {
    const existing = await this.cypherService.findConceptByNameCaseInsensitive(
      concept.name,
      tenantId
    );

    if (existing) {
      this.logger.debug(
        { conceptName: concept.name, tenantId },
        'Concept already exists — skipping create'
      );
      return;
    }

    await this.cypherService.createConcept({
      tenant_id: tenantId,
      name: concept.name,
      definition: concept.definition,
      source_ids: [courseId],
    });

    this.logger.debug(
      { conceptName: concept.name, tenantId },
      'Created new concept node'
    );
  }

  private async publishPersisted(
    courseId: string,
    tenantId: string,
    count: number
  ): Promise<void> {
    if (!this.connection) return;
    try {
      const js = this.connection.jetstream();
      const data = this.sc.encode(
        JSON.stringify({ courseId, tenantId, persistedCount: count })
      );
      await js.publish(PERSIST_SUBJECT, data);
    } catch (err) {
      this.logger.warn({ err }, `Could not publish to ${PERSIST_SUBJECT}`);
    }
  }
}
