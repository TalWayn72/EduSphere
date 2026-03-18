/**
 * Shared PubSub provider for agent execution status changes.
 *
 * Used by both AgentResolver (subscriptions) and CourseGeneratorService
 * (publishing COMPLETED/FAILED status after async workflow finishes).
 */

import { createPubSub } from 'graphql-yoga';

export interface ExecutionPayload {
  id: string;
  status: string;
  output?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export const EXECUTION_PUBSUB = 'EXECUTION_PUBSUB';

export const executionPubSub = createPubSub<{
  [key: `executionStatus_${string}`]: [
    { executionStatusChanged: ExecutionPayload },
  ];
}>();

/** NestJS provider definition for dependency injection. */
export const ExecutionPubSubProvider = {
  provide: EXECUTION_PUBSUB,
  useValue: executionPubSub,
};
