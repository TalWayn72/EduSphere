import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service.js';
import { OpenBadgesService } from './open-badges.service.js';
import { GamificationResolver } from './gamification.resolver.js';
import { XpService } from './xp.service.js';
import { StreakService } from './streak.service.js';
import { ChallengesService } from './challenges.service.js';
import { LeaderboardService } from './leaderboard.service.js';

@Module({
  providers: [
    BadgeService,
    OpenBadgesService,
    GamificationResolver,
    XpService,
    StreakService,
    ChallengesService,
    LeaderboardService,
  ],
  exports: [BadgeService, OpenBadgesService, XpService, StreakService, ChallengesService, LeaderboardService],
})
export class GamificationModule {}
