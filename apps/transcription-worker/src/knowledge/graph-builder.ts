import { Injectable, Logger } from '@nestjs/common';
import { NatsService } from '../nats/nats.service';
import type { ExtractedConcept } from './concept-extractor';

export interface ConceptsExtractedPayload {
  concepts: ExtractedConcept[];
  courseId: string;
  tenantId: string;
}

const SUBJECT = 'knowledge.concepts.extracted';

/**
 * Publishes extracted concepts to NATS for the knowledge subgraph to persist
 * into Apache AGE as graph nodes and edges.
 */
@Injectable()
export class GraphBuilder {
  private readonly logger = new Logger(GraphBuilder.name);

  constructor(private readonly natsService: NatsService) {}

  async publishConcepts(
    concepts: ExtractedConcept[],
    courseId: string,
    tenantId: string
  ): Promise<void> {
    if (concepts.length === 0) {
      this.logger.debug(
        { courseId, tenantId },
        'No concepts to publish — skipping NATS event'
      );
      return;
    }

    const payload: ConceptsExtractedPayload = {
      concepts,
      courseId,
      tenantId,
    };

    try {
      await this.natsService.publish(SUBJECT, payload as unknown as Record<string, unknown>);
      this.logger.log(
        { courseId, tenantId, count: concepts.length, subject: SUBJECT },
        'Published concepts to NATS'
      );
    } catch (err) {
      this.logger.error(
        { err, courseId, tenantId },
        'Failed to publish concepts to NATS — graph will not be updated'
      );
    }
  }
}
