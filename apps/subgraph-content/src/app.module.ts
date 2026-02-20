import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { CourseModule } from './course/course.module';
import { ModuleModule } from './module/module.module';
import { MediaModule } from './media/media.module';
import { ContentItemModule } from './content-item/content-item.module';
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
    CourseModule,
    ModuleModule,
    MediaModule,
    ContentItemModule,
  ],
})
export class AppModule {}
