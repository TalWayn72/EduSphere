import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './index.js';
import { MetricsController } from './nestjs.controller.js';
import { MetricsInterceptor } from './nestjs.interceptor.js';

export function createMetricsModule(serviceName: string): DynamicModule {
  const metricsService = new MetricsService(serviceName);

  @Global()
  @Module({
    controllers: [MetricsController],
    providers: [
      {
        provide: MetricsService,
        useValue: metricsService,
      },
      {
        provide: 'METRICS_REGISTRY',
        useValue: metricsService.registry,
      },
      {
        provide: APP_INTERCEPTOR,
        useFactory: () => new MetricsInterceptor(metricsService),
      },
    ],
    exports: [MetricsService, 'METRICS_REGISTRY'],
  })
  class GeneratedMetricsModule {}

  return {
    module: GeneratedMetricsModule,
    global: true,
  };
}
