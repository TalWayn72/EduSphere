import { GraphQLClient } from 'graphql-request';

/**
 * Lightweight GraphQL client for one-off request()-style queries (e.g. public badge verification).
 * Auth-bearing queries should use urqlClient (urql-client.ts) via the urql hooks instead.
 */
export const gqlClient = new GraphQLClient(
  import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql'
);

export * from './content.queries';
export * from './annotation.queries';
export * from './agent.queries';
export * from './knowledge.queries';
export * from './collaboration.queries';
export * from './srs.queries';
export * from './compliance.queries';
export * from './scorm.queries';

export * from './profile.queries';
export * from './roleplay.queries';
export * from './crm.queries';
export * from './library.queries';
export * from './notifications.subscriptions';
