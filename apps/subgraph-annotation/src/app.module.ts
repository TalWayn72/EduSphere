import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { AnnotationModule } from './annotation/annotation.module';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: ({ req }: any) => ({ req }),
      playground: true,
      introspection: true,
    }),
    AnnotationModule,
  ],
})
export class AppModule {}
