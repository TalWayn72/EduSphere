import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { createSubgraphLoggerModule } from '@edusphere/metrics';
import type { Request } from 'express';
import { EmbeddingModule } from './embedding/embedding.module';
import { GraphModule } from './graph/graph.module';
import { KnowledgeSourceModule } from './sources/knowledge-source.module';
import { NatsConsumerModule } from './nats/nats.module';
import { MetricsModule } from './metrics/metrics.module';
import { authMiddleware } from './auth/auth.middleware';
import { CohortInsightsModule } from './cohort-insights/cohort-insights.module';
import { PeerMatchingModule } from './peer-matching/peer-matching.module';

@Module({
  imports: [
    createSubgraphLoggerModule(),
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
    CohortInsightsModule,
    PeerMatchingModule,
  ],
})
export class AppModule {}
