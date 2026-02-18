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

  const port = process.env.PORT || 4006;
  await app.listen(port);

  logger.log(
    `🚀 Knowledge subgraph running on http://localhost:${port}/graphql`
  );
  logger.log(`📊 GraphQL Playground available`);
  logger.log(`🔍 pgvector semantic search enabled`);
  logger.log(`🕸️ Apache AGE graph queries enabled`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start application', err);
  process.exit(1);
});
