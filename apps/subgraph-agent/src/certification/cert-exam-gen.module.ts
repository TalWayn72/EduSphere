import { Module } from '@nestjs/common';
import { CertExamGenResolver } from './cert-exam-gen.resolver.js';
import { CertExamGenService } from './cert-exam-gen.service.js';
import { LlmConsentGuard } from '../ai/llm-consent.guard.js';
import { ExecutionPubSubProvider } from '../agent/execution-pubsub.provider.js';

@Module({
  providers: [
    ExecutionPubSubProvider,
    CertExamGenResolver,
    CertExamGenService,
    LlmConsentGuard,
  ],
  exports: [CertExamGenService],
})
export class CertExamGenModule {}
