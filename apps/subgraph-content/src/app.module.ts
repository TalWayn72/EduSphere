import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { CourseModule } from './course/course.module';
import { ModuleModule } from './module/module.module';
import { ContentItemModule } from './content-item/content-item.module';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: ({ req }: any) => ({ req }),
      playground: true,
      introspection: true,
    }),
    CourseModule,
    ModuleModule,
    ContentItemModule,
  ],
})
export class AppModule {}
