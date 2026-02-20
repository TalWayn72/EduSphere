import { Controller, Get, Inject, Res } from '@nestjs/common';
import { Registry } from 'prom-client';
import type { Response } from 'express';

@Controller()
export class MetricsController {
  constructor(
    @Inject('METRICS_REGISTRY') private readonly registry: Registry,
  ) {}

  @Get('metrics')
  async getMetrics(@Res() res: Response): Promise<void> {
    res.set('Content-Type', this.registry.contentType);
    const metrics = await this.registry.metrics();
    res.end(metrics);
  }
}
