/**
 * Hive Gateway v2 configuration.
 * Plugins (response cache, auth propagation) extracted to gateway-plugins.ts.
 */
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { defineConfig } from '@graphql-hive/gateway';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildGatewayPlugins } from './gateway-plugins';

const isProduction = process.env.NODE_ENV === 'production';

// Load the persisted query manifest if it exists.
const manifestPath = join(__dirname, 'persisted-queries', 'manifest.json');
const persistedQueryManifest: Record<string, string> | undefined = existsSync(
  manifestPath
)
  ? (JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, string>)
  : undefined;

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
    enabled: !isProduction,
  },

  healthCheckEndpoint: '/health',

  logging:
    (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',

  plugins: () => buildGatewayPlugins(),

  // ─── Persisted Queries ──────────────────────────────────────────────────
  ...(persistedQueryManifest
    ? {
        persistedDocuments: {
          documents: persistedQueryManifest,
          allowArbitraryDocuments: !isProduction,
        },
      }
    : {}),

  // ─── NATS Distributed Subscriptions ─────────────────────────────────────
  // Multi-replica subscription support is implemented in src/nats-subscriptions.ts.
  // The NatsPubSub bridge is wired into the GraphQL context in src/index.ts.
  //
  // Runtime behaviour:
  //   NATS_URL set   -> NatsPubSub (multi-replica)
  //   NATS_URL unset -> InProcessPubSub (single-replica)
  //
  // NATS subject convention: gw.sub.<topic>
});

export default gatewayConfig;
