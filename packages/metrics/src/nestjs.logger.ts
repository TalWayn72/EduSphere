import type { IncomingMessage } from 'node:http';
import type { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

export function createSubgraphLoggerModule(): DynamicModule {
  return LoggerModule.forRoot({
    pinoHttp: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
      transport:
        process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
          : undefined,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      customProps: (req: IncomingMessage) => ({
        tenantId: req.headers['x-tenant-id'],
        requestId: req.headers['x-request-id'],
      }),
    },
  });
}
