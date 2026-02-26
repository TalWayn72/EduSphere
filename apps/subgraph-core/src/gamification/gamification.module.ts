import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service.js';
import { OpenBadgesService } from './open-badges.service.js';
import { GamificationResolver } from './gamification.resolver.js';

@Module({
  providers: [BadgeService, OpenBadgesService, GamificationResolver],
  exports: [BadgeService, OpenBadgesService],
})
export class GamificationModule {}
