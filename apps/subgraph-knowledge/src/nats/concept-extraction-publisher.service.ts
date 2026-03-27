/**
 * ConceptExtractionPublisherService — publishes to `knowledge.concepts.extracted`
 * when a KnowledgeSource status transitions to READY.
 *
 * Concept extraction uses simple NLP (sentence splitting + noun phrase heuristics)
 * as a fallback when no LLM provider is configured.
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
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const PUBLISH_SUBJECT = 'knowledge.concepts.extracted';
const STREAM_NAME = 'KNOWLEDGE';
const MAX_CONCEPTS_PER_SOURCE = 50;

interface ExtractedConcept {
  name: string;
  definition: string;
  relatedTerms: string[];
}

@Injectable()
export class ConceptExtractionPublisherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ConceptExtractionPublisherService.name);
  private connection: NatsConnection | null = null;
  private readonly sc = StringCodec();

  async onModuleInit(): Promise<void> {
    try {
      this.connection = await connect(buildNatsOptions());
      this.logger.log('ConceptExtractionPublisher connected to NATS');
      await this.ensureStream();
    } catch (err) {
      this.logger.error(
        { err },
        '[ConceptExtractionPublisherService] NATS connection failed — publishing disabled',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.drain().catch(() => undefined);
      this.connection = null;
      this.logger.log('ConceptExtractionPublisher NATS connection drained');
    }
  }

  /**
   * Extract concepts from source text and publish to NATS.
   * Called by KnowledgeSourceService when a source transitions to READY.
   */
  async extractAndPublish(
    sourceText: string,
    courseId: string,
    tenantId: string,
  ): Promise<number> {
    if (!sourceText || sourceText.trim().length === 0) {
      this.logger.warn(
        { courseId, tenantId },
        '[ConceptExtractionPublisherService] Empty source text — skipping extraction',
      );
      return 0;
    }

    const concepts = this.extractConcepts(sourceText);

    if (concepts.length === 0) {
      this.logger.log(
        { courseId, tenantId },
        '[ConceptExtractionPublisherService] No concepts extracted from source',
      );
      return 0;
    }

    await this.publishConcepts(concepts, courseId, tenantId);
    return concepts.length;
  }

  /**
   * Simple NLP concept extraction — splits text into sentences, identifies
   * capitalized noun phrases and repeated terms as candidate concepts.
   */
  private extractConcepts(text: string): ExtractedConcept[] {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    const termFrequency = new Map<string, number>();
    const termContext = new Map<string, string>();

    for (const sentence of sentences) {
      // Extract capitalized multi-word phrases (2-4 words)
      const phrasePattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3})\b/g; // eslint-disable-line security/detect-unsafe-regex -- bounded {0,3} repetition, safe
      let match: RegExpExecArray | null;
      while ((match = phrasePattern.exec(sentence)) !== null) {
        const term = match[1]!;
        if (term.length < 4) continue; // skip short terms like "The"
        termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1);
        if (!termContext.has(term)) {
          termContext.set(term, sentence.slice(0, 200));
        }
      }
    }

    // Sort by frequency, take top N
    const sorted = [...termFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CONCEPTS_PER_SOURCE);

    const conceptNames = new Set(sorted.map(([name]) => name));

    return sorted.map(([name]) => ({
      name,
      definition: termContext.get(name) ?? '',
      relatedTerms: [...conceptNames].filter((n) => n !== name).slice(0, 5),
    }));
  }

  private async publishConcepts(
    concepts: ExtractedConcept[],
    courseId: string,
    tenantId: string,
  ): Promise<void> {
    if (!this.connection) {
      this.logger.warn(
        '[ConceptExtractionPublisherService] NATS not connected — concepts not published',
      );
      return;
    }

    try {
      const js = this.connection.jetstream();
      const payload = { concepts, courseId, tenantId };
      const data = this.sc.encode(JSON.stringify(payload));
      await js.publish(PUBLISH_SUBJECT, data);
      this.logger.log(
        { courseId, tenantId, conceptCount: concepts.length },
        '[ConceptExtractionPublisherService] Published concepts to NATS',
      );
    } catch (err) {
      this.logger.error(
        { err, courseId, tenantId },
        '[ConceptExtractionPublisherService] Failed to publish concepts',
      );
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
          max_age: 24 * 60 * 60 * 1_000_000_000, // 24h in nanoseconds
          max_bytes: 100 * 1024 * 1024, // 100 MB
        });
        this.logger.log(`Created NATS stream: ${STREAM_NAME}`);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Could not ensure KNOWLEDGE stream');
    }
  }
}
