import { Module } from '@nestjs/common';
import { LiveSummaryResolver } from './live-summary.resolver.js';
import { LiveSummaryService } from './live-summary.service.js';
import { AiLegacyRunnerService } from '../ai/ai-legacy-runner.service.js';

@Module({
  providers: [LiveSummaryResolver, LiveSummaryService, AiLegacyRunnerService],
  exports: [LiveSummaryService],
})
export class LiveSummaryModule {}
