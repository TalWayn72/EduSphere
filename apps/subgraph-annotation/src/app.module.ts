import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { AnnotationModule } from './annotation/annotation.module';
import { MetricsModule } from './metrics/metrics.module';
import { authMiddleware } from './auth/auth.middleware';

@Module({
  imports: [
    MetricsModule,
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: async ({ req }: any) => {
        const ctx = { req };
        await authMiddleware.validateRequest(ctx);
        return ctx;
      },
      playground: true,
      introspection: true,
    }),
    AnnotationModule,
  ],
})
export class AppModule {}
