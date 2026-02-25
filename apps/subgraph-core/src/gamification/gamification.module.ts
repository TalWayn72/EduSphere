import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service.js';
import { GamificationResolver } from './gamification.resolver.js';

@Module({
  providers: [BadgeService, GamificationResolver],
  exports: [BadgeService],
})
export class GamificationModule {}
