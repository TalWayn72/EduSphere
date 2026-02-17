import { defineConfig } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  supergraph: 'file://./supergraph.graphql',
  pollingInterval: 10000,
  port: Number(process.env.PORT) || 4000,
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  graphiql: {
    enabled: process.env.NODE_ENV !== 'production',
  },
  healthCheckEndpoint: '/health',
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

export default gatewayConfig;
