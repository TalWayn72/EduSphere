// MUST be the first import — patches Node.js http before the gateway loads.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('gateway');

import {
  createGatewayRuntime,
  getGraphQLWSOptions,
} from '@graphql-hive/gateway';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { WebSocketServer } from 'ws';
import { useServer as useWSServer } from 'graphql-ws/use/ws';
import {
  checkRateLimit,
  stopRateLimitCleanup,
  PREMIUM_MAX_REQUESTS,
  MAX_REQUESTS,
} from './middleware/rate-limit.js';
import { applySecurityHeaders } from './middleware/security-headers.js';
import { createNatsPubSub, shutdownNatsPubSub } from './nats-subscriptions.js';
import { registerShutdownHandlers } from './graceful-shutdown.js';
import { logger } from './gateway-config.js';
import { createGatewayPlugins } from './gateway-plugins.js';

// ── NATS pub/sub (distributed subscriptions across replicas) ─────────────────
const pubSub = await createNatsPubSub(logger);

const gateway = createGatewayRuntime({
  // Load the composed supergraph SDL (run `pnpm compose` to regenerate).
  supergraph: resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../supergraph.graphql'
  ),
  additionalResolvers: [],
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [], // NEVER wildcard in production — fail closed
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  logging:
    (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  plugins: () => createGatewayPlugins(pubSub),
});

// ── HTTP server with G-09 pre-flight rate-limit enforcement ──────────────────

const port = parseInt(process.env.PORT || '4000');

const server = createServer(async (req, res) => {
  // OWASP ASVS V14.4: Apply security headers to every response.
  applySecurityHeaders(res);

  // Health check endpoint — handled before rate-limiting and Yoga
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

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

// ── WebSocket server for GraphQL subscriptions (graphql-ws protocol) ────────

const wsServer = new WebSocketServer({ noServer: true, path: '/graphql' });
const wsOptions = getGraphQLWSOptions(gateway, () => ({}));
useWSServer(wsOptions, wsServer);

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${port}`);
  if (pathname === '/graphql') {
    wsServer.handleUpgrade(req, socket, head, (ws) => {
      wsServer.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

logger.info('WebSocket upgrade handler registered for /graphql');

server.listen(port, () => {
  logger.info(`Gateway running on http://localhost:${port}/graphql`);
  logger.info(
    `WebSocket subscriptions available at ws://localhost:${port}/graphql`
  );
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

// ── Graceful shutdown (WebSocket drain + NATS cleanup) ──────────────────────

registerShutdownHandlers({
  server,
  wsServer,
  stopRateLimitCleanup,
  shutdownNatsPubSub,
  logger,
});
