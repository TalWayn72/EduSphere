// MUST be the first import — patches Node.js http before the gateway loads.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('gateway');

import { createGateway } from '@graphql-hive/gateway';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import pino from 'pino';
import { checkRateLimit, stopRateLimitCleanup } from './middleware/rate-limit.js';
import { depthLimitRule, complexityLimitRule } from './middleware/query-complexity.js';
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

// ── G-09: Rate limiting helper ────────────────────────────────────────────────

function rateLimitedResponse(resetAt: number): Response {
  const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      errors: [
        {
          message: 'Rate limit exceeded. Please retry later.',
          extensions: { code: 'RATE_LIMIT_EXCEEDED', retryAfter: resetAt },
        },
      ],
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  );
}

// ── G-10: Collect validation rules ───────────────────────────────────────────
const validationRules = [depthLimitRule(), complexityLimitRule()];

const yoga = createYoga({
  gateway,
  // G-10: reject deeply-nested / high-complexity queries before execution
  validationRules,
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [], // NEVER wildcard in production — fail closed
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  logging: logger,
  // G-09: Rate limiting applied in context (runs before resolvers)
  context: async ({ request }) => {
    // Prefer tenant-scoped key; fall back to IP for unauthenticated requests
    const tenantId =
      (request.headers.get('x-tenant-id') as string | null) ??
      (request.headers.get('x-forwarded-for') as string | null) ??
      'unknown';

    const rateCheck = checkRateLimit(tenantId);
    if (!rateCheck.allowed) {
      logger.warn({ tenantId, resetAt: rateCheck.resetAt }, 'G-09: rate limit exceeded');
      // Yoga supports returning a Response from context to short-circuit
      throw Object.assign(new Error('Rate limit exceeded'), {
        _rateLimitResponse: rateLimitedResponse(rateCheck.resetAt),
      });
    }

    const authHeader = request.headers.get('authorization');
    let resolvedTenantId: string | null = null;
    let userId: string | null = null;
    let role: string | null = null;
    let isAuthenticated = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      // Dev bypass for E2E tests (BUG-23): accept the well-known dev token in
      // non-production environments. NEVER active when NODE_ENV=production.
      if (process.env.NODE_ENV !== 'production' && token === 'dev-token-mock-jwt') {
        resolvedTenantId = 'dev-tenant-1';
        userId = 'dev-user-1';
        role = 'SUPER_ADMIN';
        isAuthenticated = true;
      } else {
        try {
          const { payload } = await jwtVerify(token, JWKS, { issuer: KEYCLOAK_ISSUER });
          resolvedTenantId = (payload['tenant_id'] as string) ?? null;
          userId = payload.sub ?? null;
          role = (payload['role'] as string) ?? null;
          isAuthenticated = true;
        } catch (error) {
          logger.warn({ err: error }, 'JWT verification failed — request proceeds unauthenticated');
        }
      }
    }

    return {
      isAuthenticated,
      userId,
      tenantId: resolvedTenantId,
      role,
      pubSub,
      headers: {
        authorization: authHeader,
        'x-tenant-id': resolvedTenantId,
        'x-user-id': userId,
        'x-user-role': role,
      },
    };
  },
});

// ── HTTP server with G-09 pre-flight rate-limit enforcement ──────────────────
// We wrap the raw HTTP listener so that the 429 can be returned before Yoga
// even parses the GraphQL document (cheaper than post-parse rejection).

const port = parseInt(process.env.PORT || '4000');

const server = createServer(async (req, res) => {
  // Extract rate-limit key from raw HTTP headers (before Yoga parsing)
  const tenantHeader =
    req.headers['x-tenant-id'] ??
    req.headers['x-forwarded-for'] ??
    req.socket.remoteAddress ??
    'unknown';
  const key = Array.isArray(tenantHeader) ? tenantHeader[0] : tenantHeader;

  const rateCheck = checkRateLimit(key ?? 'unknown');
  if (!rateCheck.allowed) {
    const retryAfterSec = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
    logger.warn({ key, resetAt: rateCheck.resetAt }, 'G-09: rate limit exceeded (HTTP layer)');
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSec),
    });
    res.end(
      JSON.stringify({
        errors: [
          {
            message: 'Rate limit exceeded. Please retry later.',
            extensions: { code: 'RATE_LIMIT_EXCEEDED', retryAfter: rateCheck.resetAt },
          },
        ],
      }),
    );
    return;
  }

  // Forward to Yoga handler
  yoga.handle(req as unknown as Request, res as unknown as Response);
});

server.listen(port, () => {
  logger.info(`Gateway running on http://localhost:${port}/graphql`);
  logger.info('GraphQL Playground available');
  logger.info(
    { maxDepth: process.env['GRAPHQL_MAX_DEPTH'] ?? 10, maxComplexity: process.env['GRAPHQL_MAX_COMPLEXITY'] ?? 1000, rateLimitMax: process.env['RATE_LIMIT_MAX'] ?? 100 },
    'G-09/G-10: rate limiting + query guards active',
  );
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal — draining connections');

  server.close(() => {
    logger.info('HTTP server closed');
  });

  stopRateLimitCleanup();
  logger.info('Rate-limit cleanup stopped');

  await shutdownNatsPubSub();
  logger.info('NATS pub/sub drained');

  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
