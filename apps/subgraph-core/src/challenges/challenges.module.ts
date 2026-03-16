import { Module } from '@nestjs/common';
import { ChallengesResolver } from './challenges.resolver';
import { GroupChallengeService } from './group-challenge.service';
import { GroupChallengeLeaderboardService } from './group-challenge-leaderboard.service';

@Module({
  providers: [
    GroupChallengeService,
    GroupChallengeLeaderboardService,
    ChallengesResolver,
  ],
  exports: [GroupChallengeService, GroupChallengeLeaderboardService],
})
export class ChallengesModule {}
