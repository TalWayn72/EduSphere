import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service.js';
import { OpenBadgesService } from './open-badges.service.js';
import { GamificationResolver } from './gamification.resolver.js';
import { XpService } from './xp.service.js';

@Module({
  providers: [BadgeService, OpenBadgesService, GamificationResolver, XpService],
  exports: [BadgeService, OpenBadgesService, XpService],
})
export class GamificationModule {}
