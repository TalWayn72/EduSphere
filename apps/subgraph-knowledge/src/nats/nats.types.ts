/**
 * Shape of each concept in the `knowledge.concepts.extracted` NATS event
 * published by the transcription worker.
 */
export interface ExtractedConcept {
  name: string;
  definition: string;
  relatedTerms: string[];
}

/**
 * Full payload of the `knowledge.concepts.extracted` NATS event.
 */
export interface ConceptsExtractedPayload {
  concepts: ExtractedConcept[];
  courseId: string;
  tenantId: string;
}

/**
 * Payload published on `knowledge.concepts.persisted` after concepts
 * have been written into Apache AGE.
 */
export interface ConceptsPersistedPayload {
  courseId: string;
  tenantId: string;
  persistedCount: number;
}
