// MUST be the first import — patches Node.js http before the gateway loads.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('gateway');

import { createGatewayRuntime } from '@graphql-hive/gateway';
import { createServer } from 'http';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import pino from 'pino';
import {
  checkRateLimit,
  stopRateLimitCleanup,
  PREMIUM_MAX_REQUESTS,
  MAX_REQUESTS,
} from './middleware/rate-limit.js';
import {
  depthLimitRule,
  complexityLimitRule,
} from './middleware/query-complexity.js';
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
    }
  );
}

const gateway = createGatewayRuntime({
  // Load the composed supergraph SDL (run `pnpm compose` to regenerate).
  // Subgraph URLs come from environment variables and are set in the SDL via
  // @join__graph directives.  At runtime the gateway resolves each subgraph
  // URL from the env vars below so the SDL itself only needs to be valid SDL.
  supergraph: new URL('../../supergraph.graphql', import.meta.url).pathname,
  additionalResolvers: [],
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [], // NEVER wildcard in production — fail closed
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  logging: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  // BUG-049: Forward Authorization header from the Yoga context to every
  // subgraph HTTP fetch. Hive Gateway does not automatically propagate
  // Authorization headers. For HTTP requests the header comes from
  // context.headers.authorization (set by the Yoga context function below).
  // For WebSocket subscriptions the header originates from connectionParams
  // (extracted below) and placed into context.headers.authorization so that
  // this single plugin handles both transports uniformly.
  plugins: () => [
    // G-10: query depth + complexity validation
    {
      onValidate({ addValidationRule }: { addValidationRule: (rule: unknown) => void }) {
        addValidationRule(depthLimitRule());
        addValidationRule(complexityLimitRule());
      },
    },
    // G-09 + BUG-049: JWT auth context + header forwarding
    {
      async onContextBuilding({ context, extendContext }: {
        context: Record<string, unknown>;
        extendContext: (ext: Record<string, unknown>) => void;
      }) {
        const request = context['request'] as Request | undefined;
        if (!request) return;

        // BUG-049 fix: WebSocket subscriptions (graphql-ws protocol) send the JWT
        // in connectionParams: { authorization: 'Bearer <token>' }, NOT in HTTP
        // headers (which belong to the TCP upgrade handshake, not the GQL session).
        const wsConnectionParams = context['connectionParams'] as Record<string, unknown> | undefined;
        const wsAuthHeader =
          typeof wsConnectionParams?.['authorization'] === 'string'
            ? wsConnectionParams['authorization']
            : undefined;

        // Prefer tenant-scoped key; fall back to IP for unauthenticated requests
        const tenantId =
          request.headers.get('x-tenant-id') ??
          request.headers.get('x-forwarded-for') ??
          'unknown';

        const rateCheck = checkRateLimit(tenantId);
        if (!rateCheck.allowed) {
          logger.warn(
            { tenantId, resetAt: rateCheck.resetAt },
            'G-09: rate limit exceeded (context)'
          );
          throw Object.assign(new Error('Rate limit exceeded'), {
            _rateLimitResponse: rateLimitedResponse(rateCheck.resetAt),
          });
        }

        // Use HTTP header first; fall back to WebSocket connectionParams for subscriptions.
        const authHeader =
          request.headers.get('authorization') ?? wsAuthHeader ?? null;
        let resolvedTenantId: string | null = null;
        let userId: string | null = null;
        let role: string | null = null;
        let isAuthenticated = false;

        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);

          // Dev bypass for E2E tests (BUG-23): accept the well-known dev token in
          // non-production environments. NEVER active when NODE_ENV=production.
          if (
            process.env.NODE_ENV !== 'production' &&
            token === 'dev-token-mock-jwt'
          ) {
            resolvedTenantId = '00000000-0000-0000-0000-000000000000';
            userId = '00000000-0000-0000-0000-000000000001';
            role = 'SUPER_ADMIN';
            isAuthenticated = true;
          } else {
            try {
              const { payload } = await jwtVerify(token, JWKS, {
                issuer: KEYCLOAK_ISSUER,
              });
              resolvedTenantId = (payload['tenant_id'] as string) ?? null;
              userId = payload.sub ?? null;
              // Support both a top-level "role" claim (custom mapper) and the
              // standard Keycloak realm_access.roles array (default).
              const APP_ROLES = new Set([
                'SUPER_ADMIN',
                'ORG_ADMIN',
                'INSTRUCTOR',
                'STUDENT',
                'RESEARCHER',
              ]);
              role =
                (payload['role'] as string) ??
                (
                  (
                    (payload['realm_access'] as Record<string, unknown>)
                      ?.['roles'] as string[]
                  )?.find((r) => APP_ROLES.has(r)) ?? null
                );
              isAuthenticated = true;
              if (wsAuthHeader && !request.headers.get('authorization')) {
                logger.debug(
                  { userId },
                  'Gateway: authenticated subscription via WebSocket connectionParams'
                );
              }
            } catch (error) {
              logger.warn(
                { err: error },
                'JWT verification failed — request proceeds unauthenticated'
              );
            }
          }
        }

        extendContext({
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
        });
      },
    },
    // BUG-049: Forward Authorization header to every subgraph fetch
    {
      onFetch({
        options,
        setOptions,
        context,
      }: {
        options: RequestInit;
        setOptions: (opts: RequestInit) => void;
        context: unknown;
      }) {
        const ctx = context as
          | { headers?: { authorization?: string | null } }
          | null
          | undefined;
        const auth = ctx?.headers?.authorization;
        if (!auth) return;
        const prev = options.headers as Record<string, string> | undefined;
        setOptions({
          ...options,
          headers: { ...(prev ?? {}), authorization: auth },
        });
      },
    },
  ],
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
    logger.warn(
      { key, resetAt: rateCheck.resetAt },
      'G-09: rate limit exceeded (HTTP layer)'
    );
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfterSec),
    });
    res.end(
      JSON.stringify({
        errors: [
          {
            message: 'Rate limit exceeded. Please retry later.',
            extensions: {
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateCheck.resetAt,
            },
          },
        ],
      })
    );
    return;
  }

  // Forward to gateway handler
  gateway.handle(req as unknown as Request, res as unknown as Response);
});

server.listen(port, () => {
  logger.info(`Gateway running on http://localhost:${port}/graphql`);
  logger.info('GraphQL Playground available');
  logger.info(
    {
      maxDepth: process.env['GRAPHQL_MAX_DEPTH'] ?? 10,
      maxComplexity: process.env['GRAPHQL_MAX_COMPLEXITY'] ?? 1000,
      rateLimitStandardPerMin: MAX_REQUESTS,
      rateLimitPremiumPerMin: PREMIUM_MAX_REQUESTS,
      premiumTenants: process.env['RATE_LIMIT_PREMIUM_TENANTS'] ?? '(none)',
    },
    'G-09/G-10: per-tenant rate limiting (standard/premium tiers) + query guards active'
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
