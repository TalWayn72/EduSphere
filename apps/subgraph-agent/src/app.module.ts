import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { AgentSessionModule } from './agent-session/agent-session.module';
import { AgentMessageModule } from './agent-message/agent-message.module';
import { TemplateModule } from './template/template.module';
import { AgentModule } from './agent/agent.module';
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
    AgentSessionModule,
    AgentMessageModule,
    TemplateModule,
    AgentModule,
  ],
})
export class AppModule {}
