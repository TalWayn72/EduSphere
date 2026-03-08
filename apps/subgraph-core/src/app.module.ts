import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { createSubgraphLoggerModule } from '@edusphere/metrics';
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
import { NotificationsModule } from './notifications/notifications.module';
import { SavedSearchModule } from './search/saved-search.module.js';
import { ManagerModule } from './manager/manager.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    createSubgraphLoggerModule(),
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
    NotificationsModule,
    SavedSearchModule,
    ManagerModule,
    OnboardingModule,
  ],
})
export class AppModule {}
