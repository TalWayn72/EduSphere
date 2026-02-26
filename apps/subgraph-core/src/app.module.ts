import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { LoggerModule } from 'nestjs-pino';
import { UserModule } from './user/user.module';
import { TenantModule } from './tenant/tenant.module';
import { SrsModule } from './srs/srs.module';
import { authMiddleware } from './auth/auth.middleware';
import { MetricsModule } from './metrics/metrics.module';
import { GamificationModule } from './gamification/gamification.module.js';
import { ScimModule } from './scim/scim.module.js';
import { SocialModule } from './social/social.module';
import { CrmModule } from './crm/crm.module.js';
import { PortalModule } from './portal/portal.module.js';
import { AdminModule } from './admin/admin.module';

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
        customProps: (req: unknown) => {
          const r = req as { headers?: Record<string, string> };
          return {
            tenantId: r.headers?.['x-tenant-id'],
            requestId: r.headers?.['x-request-id'],
          };
        },
      },
    }),
    MetricsModule,
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: async ({ req }: { req: unknown }) => {
        const ctx = { req };
        await authMiddleware.validateRequest(
          ctx as Parameters<typeof authMiddleware.validateRequest>[0]
        );
        return ctx;
      },
      playground: true,
      introspection: true,
    }),
    UserModule,
    TenantModule,
    SrsModule,
    GamificationModule,
    ScimModule,
    SocialModule,
    CrmModule,
    PortalModule,
    AdminModule,
  ],
})
export class AppModule {}
