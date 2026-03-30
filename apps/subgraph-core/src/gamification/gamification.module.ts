import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service.js';
import { BadgeEventHandlersService } from './badge-event-handlers.service.js';
import { BadgeQueriesService } from './badge-queries.service.js';
import { OpenBadgesService } from './open-badges.service.js';
import { GamificationResolver } from './gamification.resolver.js';
import { XpService } from './xp.service.js';
import { StreakService } from './streak.service.js';
import { ChallengesService } from './challenges.service.js';
import { LeaderboardService } from './leaderboard.service.js';
import { OrgBadgeService } from './org-badge.service.js';
import { BadgeAutoAwardService } from './badge-auto-award.service.js';

@Module({
  providers: [
    BadgeService,
    BadgeEventHandlersService,
    BadgeQueriesService,
    OpenBadgesService,
    GamificationResolver,
    XpService,
    StreakService,
    ChallengesService,
    LeaderboardService,
    OrgBadgeService,
    BadgeAutoAwardService,
  ],
  exports: [
    BadgeService,
    OpenBadgesService,
    XpService,
    StreakService,
    ChallengesService,
    LeaderboardService,
    OrgBadgeService,
    BadgeAutoAwardService,
  ],
})
export class GamificationModule {}
