// MUST be the first import — patches Node.js http, pg, etc. before NestJS loads.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('subgraph-knowledge');

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable Express's built-in body-parser (100 KB default limit).
  // GraphQL Yoga reads the raw request stream directly, so no limit applies.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));

  // CORS for development
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  const port = process.env.PORT || 4006;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(
    'Knowledge subgraph running on http://localhost:' + port + '/graphql',
    'Bootstrap'
  );
  logger.log('GraphQL Playground available', 'Bootstrap');
  logger.log('pgvector semantic search enabled', 'Bootstrap');
  logger.log('Apache AGE graph queries enabled', 'Bootstrap');
}

bootstrap().catch((err) => {
  process.stderr.write('Failed to start application: ' + String(err) + '\n');
  process.exit(1);
});
