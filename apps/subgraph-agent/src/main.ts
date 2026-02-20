// MUST be the first import — patches Node.js http, pg, etc. before NestJS loads.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('subgraph-agent');

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // CORS for development
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  const port = process.env.PORT || 4005;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log('Agent subgraph running on http://localhost:' + port + '/graphql', 'Bootstrap');
  logger.log('Serving: AI Sessions, Messages', 'Bootstrap');
}

bootstrap().catch((err) => {
  process.stderr.write('Failed to start application: ' + String(err) + '\n');
  process.exit(1);
});
