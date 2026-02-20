import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaFederationDriver } from '@graphql-yoga/nestjs-federation';
import { LoggerModule } from 'nestjs-pino';
import { AgentSessionModule } from './agent-session/agent-session.module';
import { AgentMessageModule } from './agent-message/agent-message.module';
import { TemplateModule } from './template/template.module';
import { AgentModule } from './agent/agent.module';
import { MetricsModule } from './metrics/metrics.module';
import { authMiddleware } from './auth/auth.middleware';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
          : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        customProps: (req: any) => ({
          tenantId: req.headers['x-tenant-id'],
          requestId: req.headers['x-request-id'],
        }),
      },
    }),
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
