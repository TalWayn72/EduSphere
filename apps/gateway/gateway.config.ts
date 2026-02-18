import { defineConfig } from '@graphql-hive/gateway';
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
});

export default gatewayConfig;
