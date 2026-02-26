import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'http';
import type { Request } from 'express';
import { EmbeddingModule } from './embedding/embedding.module';
import { GraphModule } from './graph/graph.module';
import { KnowledgeSourceModule } from './sources/knowledge-source.module';
import { NatsConsumerModule } from './nats/nats.module';
import { MetricsModule } from './metrics/metrics.module';
import { authMiddleware } from './auth/auth.middleware';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        customProps: (req: IncomingMessage) => ({
          tenantId: req.headers['x-tenant-id'],
          requestId: req.headers['x-request-id'],
        }),
      },
    }),
    MetricsModule,
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: async ({ req }: { req: Request }) => {
        const ctx = { req };
        await authMiddleware.validateRequest(ctx);
        return ctx;
      },
      playground: true,
      introspection: true,
    }),
    EmbeddingModule,
    GraphModule,
    KnowledgeSourceModule,
    NatsConsumerModule,
  ],
})
export class AppModule {}
