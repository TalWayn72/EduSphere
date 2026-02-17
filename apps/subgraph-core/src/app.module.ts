import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { UserModule } from './user/user.module';
import { TenantModule } from './tenant/tenant.module';
import { authMiddleware } from './auth/auth.middleware';

@Module({
  imports: [
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
    UserModule,
    TenantModule,
  ],
})
export class AppModule {}
