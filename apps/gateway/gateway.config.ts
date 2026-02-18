import { defineConfig } from '@graphql-hive/gateway';

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
    enabled: process.env.NODE_ENV !== 'production',
  },
  healthCheckEndpoint: '/health',
  logging: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
});

export default gatewayConfig;
