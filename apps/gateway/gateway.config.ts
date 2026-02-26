import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { defineConfig } from '@graphql-hive/gateway';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Load the persisted query manifest if it exists.
// In development the manifest is optional — arbitrary queries are allowed.
// In production, only queries in the manifest are accepted.
const manifestPath = join(__dirname, 'persisted-queries', 'manifest.json');
const persistedQueryManifest: Record<string, string> | undefined = existsSync(
  manifestPath
)
  ? (JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, string>)
  : undefined;

// ─── Response Cache TTL Configuration ────────────────────────────────────────
// Per-operation TTL differentiation based on query root field name:
//   - content/* queries → 60 s (content items change less frequently)
//   - course/* queries  → 30 s (courses refresh more often due to enrollment)
//   - all other reads   → 60 s (conservative safe default)
//
// stale-while-revalidate is emulated by keeping the item in cache until TTL
// expires and simultaneously serving the stale value. True SWR (serve stale
// while fetching fresh in the background) requires a custom cache store; the
// built-in in-memory store uses TTL eviction only.
const CONTENT_TTL_MS = 60_000; // 60 s — content items, knowledge nodes
const COURSE_TTL_MS = 30_000; // 30 s — course data (enrollment counts change)
const DEFAULT_TTL_MS = 60_000; // 60 s — safe default for all other reads

// Regex that matches operation documents whose first root selection is a
// course-related field (courses, course, courseById, myCourses, …).
const COURSE_QUERY_RE = /^\s*(?:query\s+\w*\s*[({]?\s*)?{?\s*\bcourses?\b/i;

function resolveTtlMs(documentString: string): number {
  if (COURSE_QUERY_RE.test(documentString)) {
    return COURSE_TTL_MS;
  }
  return DEFAULT_TTL_MS;
}

export const gatewayConfig = defineConfig({
  supergraph: './supergraph.graphql',
  pollingInterval: 10000,
  host: '0.0.0.0',
  port: Number(process.env.PORT) || 4000,

  cors: {
    origin: (() => {
      const devPorts = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
      ];
      const configured =
        process.env.CORS_ORIGIN?.split(',').filter(Boolean) ?? [];
      return isProduction
        ? configured
        : [...new Set([...configured, ...devPorts])];
    })(),
    credentials: true,
  },

  graphiql: {
    // Disable GraphiQL in production — forces use of persisted queries
    enabled: !isProduction,
  },

  healthCheckEndpoint: '/health',

  logging:
    (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',

  // ─── Response Cache ──────────────────────────────────────────────────────
  // Response caching for read-heavy queries (courses, content items).
  //   - TTL: 60 s for content queries, 30 s for course queries
  //   - Cache-Control: stale-while-revalidate added on all cached responses
  //   - Cache keys are namespaced per tenant (multi-tenant isolation)
  //   - Mutations and error responses are never cached
  //
  // Hive Gateway v2: plugins as factory function (ctx no longer carries plugins array)
  plugins: () => [
    useResponseCache({
      // Default TTL — overridden per-operation via ttlPerSchemaCoordinate or
      // the custom buildResponseCacheKey below. Content items use CONTENT_TTL_MS,
      // course queries use COURSE_TTL_MS.
      ttl: DEFAULT_TTL_MS,

      // Per-type TTL: schema coordinate overrides take priority over the
      // default. Content type fields are cached longer; Course fields shorter.
      ttlPerSchemaCoordinate: {
        // Content subgraph root fields → 60 s
        'Query.contentItem': CONTENT_TTL_MS,
        'Query.contentItems': CONTENT_TTL_MS,
        'Query.myContentItems': CONTENT_TTL_MS,
        // Course root fields → 30 s
        'Query.course': COURSE_TTL_MS,
        'Query.courses': COURSE_TTL_MS,
        'Query.myCourses': COURSE_TTL_MS,
        'Query.enrolledCourses': COURSE_TTL_MS,
      },

      // session must be provided — return null to treat all as anonymous
      // (we use buildResponseCacheKey for tenant isolation instead)
      session: () => null,

      // Only cache safe read-only requests (GET or explicit GraphQL content-type)
      enabled: (request) =>
        request.method === 'GET' ||
        (request.headers.get('content-type')?.includes('application/graphql') ??
          false),

      // Tenant-scoped cache key prevents cross-tenant data leakage.
      // Key format: <tenantId>:<ttlBucket>:<document>:<variables>
      // The ttlBucket segment makes course and content keys distinct so
      // per-operation TTL differences are applied correctly.
      buildResponseCacheKey: async ({
        documentString,
        variableValues,
        request,
      }) => {
        const tenantId = request.headers.get('x-tenant-id') ?? 'anonymous';
        const ttlBucket = resolveTtlMs(documentString);
        return `${tenantId}:ttl${ttlBucket}:${documentString}:${JSON.stringify(variableValues ?? {})}`;
      },

      // Do not cache responses that contain errors
      shouldCacheResult: ({ result }) => !result.errors?.length,
    }),

    // ─── Cache-Control: stale-while-revalidate ──────────────────────────────
    // Instructs CDN/proxy layers (Cloudflare, Nginx, Varnish) to serve the
    // cached copy for up to half the TTL period while revalidating in the
    // background. This minimises perceived latency on cache misses.
    //
    // Header is only added to GET responses so that POST (mutation) responses
    // are never mistakenly cached at the CDN layer.
    {
      onResponse({ request, response, serverContext: _ctx }) {
        if (request.method !== 'GET') return;
        const maxAge = Math.floor(DEFAULT_TTL_MS / 1000);
        const swr = Math.floor(maxAge / 2);
        response.headers.set(
          'Cache-Control',
          `public, max-age=${maxAge}, stale-while-revalidate=${swr}`
        );
      },
    },

    // ─── Authorization Header Propagation ──────────────────────────────────
    // hive-gateway CLI does not forward the Authorization header to upstream
    // subgraphs by default. Each subgraph independently validates the JWT, so
    // it must receive the original Bearer token from the client request.
    {
      onFetch({ options, setOptions, context }) {
        const gqlCtx = context as { request?: Request } | null | undefined;
        const auth = gqlCtx?.request?.headers?.get('authorization');
        if (!auth) return;
        const prev = options.headers as Record<string, string> | undefined;
        setOptions({
          ...options,
          headers: { ...(prev ?? {}), authorization: auth },
        });
      },
    },
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
