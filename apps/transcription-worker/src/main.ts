import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Transcription worker does not expose HTTP; bind to a minimal port for health probes
  const port = process.env.PORT || 3100;
  await app.listen(port);

  logger.log(`Transcription worker running on port ${port}`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start transcription worker', err);
  process.exit(1);
});
