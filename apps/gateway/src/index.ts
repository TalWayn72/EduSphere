// MUST be the first import — patches Node.js http before the gateway loads.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('gateway');

import { createGateway } from '@graphql-hive/gateway';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import pino from 'pino';
import { createNatsPubSub, shutdownNatsPubSub } from './nats-subscriptions.js';

const logger = pino({
  transport: { target: 'pino-pretty' },
  level: 'info',
});

const JWKS_URL =
  process.env.KEYCLOAK_JWKS_URL ||
  'http://localhost:8080/realms/edusphere/protocol/openid-connect/certs';
const KEYCLOAK_ISSUER = `${process.env.KEYCLOAK_URL || 'http://localhost:8080'}/realms/${process.env.KEYCLOAK_REALM || 'edusphere'}`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

// ── NATS pub/sub (distributed subscriptions across replicas) ─────────────────
// Initialised before the gateway so it is ready for the first subscription.
// Falls back to in-process EventEmitter when NATS_URL is not configured.
const pubSub = await createNatsPubSub(logger);

const gateway = createGateway({
  supergraph: {
    type: 'config',
    config: {
      subgraphs: [
        { name: 'core', url: process.env.SUBGRAPH_CORE_URL || 'http://localhost:4001/graphql' },
        { name: 'content', url: process.env.SUBGRAPH_CONTENT_URL || 'http://localhost:4002/graphql' },
        { name: 'annotation', url: process.env.SUBGRAPH_ANNOTATION_URL || 'http://localhost:4003/graphql' },
        { name: 'collaboration', url: process.env.SUBGRAPH_COLLABORATION_URL || 'http://localhost:4004/graphql' },
        { name: 'agent', url: process.env.SUBGRAPH_AGENT_URL || 'http://localhost:4005/graphql' },
        { name: 'knowledge', url: process.env.SUBGRAPH_KNOWLEDGE_URL || 'http://localhost:4006/graphql' },
      ],
    },
  },
  additionalResolvers: [],
});

const yoga = createYoga({
  gateway,
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [], // NEVER wildcard in production — fail closed
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  logging: logger,
  context: async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    let tenantId: string | null = null;
    let userId: string | null = null;
    let role: string | null = null;
    let isAuthenticated = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const { payload } = await jwtVerify(token, JWKS, { issuer: KEYCLOAK_ISSUER });
        tenantId = (payload['tenant_id'] as string) ?? null;
        userId = payload.sub ?? null;
        role = (payload['role'] as string) ?? null;
        isAuthenticated = true;
      } catch (error) {
        logger.warn({ err: error }, 'JWT verification failed — request proceeds unauthenticated');
      }
    }

    return {
      isAuthenticated,
      userId,
      tenantId,
      role,
      // Pub/sub engine available to subscription resolvers via context
      pubSub,
      headers: {
        authorization: authHeader,
        'x-tenant-id': tenantId,
        'x-user-id': userId,
        'x-user-role': role,
      },
    };
  },
});

const port = parseInt(process.env.PORT || '4000');
const server = createServer(yoga);

server.listen(port, () => {
  logger.info(`Gateway running on http://localhost:${port}/graphql`);
  logger.info('GraphQL Playground available');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal — draining connections');

  server.close(() => {
    logger.info('HTTP server closed');
  });

  await shutdownNatsPubSub();
  logger.info('NATS pub/sub drained');

  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
