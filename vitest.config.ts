import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/web/vitest.config.ts',
      'apps/mobile/vitest.config.ts',
      'apps/gateway/vitest.config.ts',
      'apps/subgraph-agent/vitest.config.ts',
      'apps/subgraph-annotation/vitest.config.ts',
      'apps/subgraph-collaboration/vitest.config.ts',
      'apps/subgraph-content/vitest.config.ts',
      'apps/subgraph-core/vitest.config.ts',
      'apps/subgraph-knowledge/vitest.config.ts',
      'packages/auth/vitest.config.ts',
      'packages/config/vitest.config.ts',
      'packages/db/vitest.config.ts',
      'packages/eslint-config/vitest.config.ts',
      'packages/frontend-client/vitest.config.ts',
      'packages/graphql-shared/vitest.config.ts',
      'packages/health/vitest.config.ts',
      'packages/langgraph-workflows/vitest.config.ts',
      'packages/metrics/vitest.config.ts',
      'packages/nats-client/vitest.config.ts',
      'packages/rag/vitest.config.ts',
      'packages/redis-pubsub/vitest.config.ts',
      'packages/telemetry/vitest.config.ts',
      'tests/security/vitest.config.ts',
    ],
  },
});
