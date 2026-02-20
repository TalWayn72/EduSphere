// MUST be the first import — patches Node.js http, pg, etc. before NestJS loads.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('subgraph-core');

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // CORS for development
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  const port = process.env.PORT || 4001;
  await app.listen(port);

  logger.log(`🚀 Core subgraph running on http://localhost:${port}/graphql`);
  logger.log(`📊 GraphQL Playground available`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start application', err);
  process.exit(1);
});
