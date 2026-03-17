/**
 * EduSphere NATS Event Types — Barrel Re-export
 *
 * These types are the TypeScript implementation of the AsyncAPI specification
 * defined in packages/nats-client/events.asyncapi.yaml
 *
 * IMPORTANT: When updating event schemas, update the AsyncAPI spec FIRST,
 * then update these types to match. The spec is the source of truth.
 *
 * Domain files:
 *   agent-events.ts      — Agent session & message events
 *   annotation-events.ts — Annotation CRUD events
 *   content-events.ts    — Content, media, transcription, translation events
 *   knowledge-events.ts  — Knowledge graph concept events
 *   lesson-events.ts     — Lesson pipeline events
 *   social-events.ts     — Social feed, peer review, discussion, follow events
 *   course-events.ts     — Course enrollment, completion, badge events
 *   gateway-events.ts    — Gateway pub/sub, submission, poll events, NatsSubjects
 */

export * from './agent-events.js';
export * from './annotation-events.js';
export * from './content-events.js';
export * from './knowledge-events.js';
export * from './lesson-events.js';
export * from './social-events.js';
export * from './course-events.js';
export * from './gateway-events.js';

// ─── Discriminated Union ─────────────────────────────────────────────────────

import type { AgentSessionPayload, AgentMessagePayload } from './agent-events.js';
import type { AnnotationPayload } from './annotation-events.js';
import type {
  ContentPayload,
  MediaPayload,
  TranscriptionPayload,
  ContentTranslationPayload,
} from './content-events.js';
import type { KnowledgeConceptPayload, KnowledgeConceptDeletedPayload } from './knowledge-events.js';
import type { LessonPayload, LessonPipelineModuleCompletedPayload, LessonNEREntitiesPayload } from './lesson-events.js';
import type {
  SocialFeedItemPayload,
  PeerReviewAssignedPayload,
  PeerReviewCompletedPayload,
  DiscussionReplyPayload,
  UserFollowedPayload,
} from './social-events.js';
import type { GatewayPubSubPayload, PollVotePayload } from './gateway-events.js';

export type NatsEvent =
  | AgentSessionPayload
  | AgentMessagePayload
  | AnnotationPayload
  | ContentPayload
  | MediaPayload
  | TranscriptionPayload
  | KnowledgeConceptPayload
  | KnowledgeConceptDeletedPayload
  | ContentTranslationPayload
  | GatewayPubSubPayload
  | UserFollowedPayload
  | PollVotePayload
  | LessonPayload
  | LessonPipelineModuleCompletedPayload
  | LessonNEREntitiesPayload
  | SocialFeedItemPayload
  | PeerReviewAssignedPayload
  | PeerReviewCompletedPayload
  | DiscussionReplyPayload;
