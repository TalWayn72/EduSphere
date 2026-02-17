import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { EmbeddingModule } from './embedding/embedding.module';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: ({ req }: any) => ({ req }),
      playground: true,
      introspection: true,
    }),
    EmbeddingModule,
  ],
})
export class AppModule {}
