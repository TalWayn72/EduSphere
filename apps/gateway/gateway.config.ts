import { defineConfig } from '@graphql-hive/gateway';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Load the persisted query manifest if it exists.
// In development the manifest is optional — arbitrary queries are allowed.
// In production, only queries in the manifest are accepted.
const manifestPath = join(__dirname, 'persisted-queries', 'manifest.json');
const persistedQueryManifest: Record<string, string> | undefined =
  existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, string>)
    : undefined;

export const gatewayConfig = defineConfig({
  supergraph: './supergraph.graphql',
  pollingInterval: 10000,
  host: '0.0.0.0',
  port: Number(process.env.PORT) || 4000,

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },

  graphiql: {
    // Disable GraphiQL in production — forces use of persisted queries
    enabled: !isProduction,
  },

  healthCheckEndpoint: '/health',

  logging: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',

  // ─── Response Cache ──────────────────────────────────────────────────────
  // Caches GET and application/graphql requests for 60 seconds.
  // Cache keys are namespaced per tenant to enforce multi-tenant isolation.
  // Mutations and error responses are never cached.
  // Hive Gateway v2: plugins as factory function (ctx no longer carries plugins array)
  plugins: () => [
    useResponseCache({
      // Cache for 60 seconds by default
      ttl: 60_000,
      // Only cache safe read-only requests (GET or explicit GraphQL content-type)
      enabled: (request) =>
        request.method === 'GET' ||
        (request.headers.get('content-type')?.includes('application/graphql') ?? false),
      // Tenant-scoped cache key prevents cross-tenant data leakage
      buildResponseCacheKey: async ({ documentString, variableValues, request }) => {
        const tenantId = request.headers.get('x-tenant-id') ?? 'anonymous';
        return `${tenantId}:${documentString}:${JSON.stringify(variableValues ?? {})}`;
      },
      // Do not cache responses that contain errors
      shouldCacheResult: ({ result }) => !result.errors?.length,
    }),
  ],

  // ─── Persisted Queries ──────────────────────────────────────────────────
  // When manifest is present:
  //   - production:   allowArbitraryDocuments = false (strict mode)
  //   - development:  allowArbitraryDocuments = true  (dev convenience)
  //
  // See apps/gateway/persisted-queries/README.md for manifest generation.
  ...(persistedQueryManifest
    ? {
        persistedDocuments: {
          documents: persistedQueryManifest,
          // Reject any query not in the manifest when running in production
          allowArbitraryDocuments: !isProduction,
        },
      }
    : {}),

  // ─── NATS Distributed Subscriptions ─────────────────────────────────────
  // Multi-replica subscription support is implemented in src/nats-subscriptions.ts.
  //
  // The NatsPubSub bridge is wired into the GraphQL context in src/index.ts
  // so that subscription resolvers can call ctx.pubSub.publish() / .subscribe().
  //
  // Runtime behaviour:
  //   NATS_URL set   → NatsPubSub (multi-replica, events fan-out via gw.sub.* subjects)
  //   NATS_URL unset → InProcessPubSub (single-replica, in-memory EventEmitter)
  //
  // NATS subject convention: gw.sub.<topic>
  //
  // To add a new subscription topic in a subgraph resolver:
  //   async *myField(_root, _args, ctx) {
  //     const unsubscribe = await ctx.pubSub.subscribe('my-topic', (payload) => {
  //       // push payload to the AsyncGenerator
  //     });
  //     try { yield* asyncGenerator; } finally { unsubscribe(); }
  //   }
  //
  // To emit events from a mutation resolver:
  //   await ctx.pubSub.publish('my-topic', { data: ... });
  //
  // Environment variables:
  //   NATS_URL=nats://nats:4222   (required for multi-replica mode)
});

export default gatewayConfig;
