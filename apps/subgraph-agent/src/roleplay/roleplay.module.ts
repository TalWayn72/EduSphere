import { Module } from '@nestjs/common';
import { RoleplayResolver } from './roleplay.resolver';
import { RoleplayService } from './roleplay.service';
import { RoleplaySessionService } from './roleplay-session.service';
import { LlmConsentGuard } from '../ai/llm-consent.guard';

@Module({
  providers: [RoleplayResolver, RoleplayService, RoleplaySessionService, LlmConsentGuard],
  exports: [RoleplayService, RoleplaySessionService],
})
export class RoleplayModule {}
