import type { IncomingMessage } from 'http';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { createSubgraphLoggerModule } from '@edusphere/metrics';
import { AgentSessionModule } from './agent-session/agent-session.module';
import { AgentMessageModule } from './agent-message/agent-message.module';
import { TemplateModule } from './template/template.module';
import { AgentModule } from './agent/agent.module';
import { RoleplayModule } from './roleplay/roleplay.module';
import { MetricsModule } from './metrics/metrics.module';
import { authMiddleware } from './auth/auth.middleware';

@Module({
  imports: [
    createSubgraphLoggerModule(),
    MetricsModule,
    GraphQLModule.forRoot({
      driver: YogaFederationDriver,
      typePaths: ['./**/*.graphql'],
      context: async ({ req }: { req: IncomingMessage }) => {
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
    RoleplayModule,
  ],
})
export class AppModule {}
