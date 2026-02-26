import { defineConfig } from '@graphql-hive/gateway';

export default defineConfig({
  // Supergraph configuration
  supergraph: {
    type: 'hive',
    // Will be composed dynamically from subgraphs or loaded from file
    file: './supergraph.graphql',
  },

  // Server configuration
  port: Number(process.env.PORT) || 4000,

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  },

  // GraphiQL playground
  graphiql: {
    enabled: process.env.NODE_ENV !== 'production',
    endpoint: '/graphql',
  },

  // Health check endpoint
  healthCheckEndpoint: '/health',

  // Logging configuration
  logging: {
    level:
      (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  },

  // Polling interval for schema updates (10 seconds)
  pollingInterval: 10000,
});
