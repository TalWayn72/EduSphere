import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { UserAdminService } from './user-admin.service';
import { UserStatsService } from './user-stats.service';
import { UserPreferencesService } from './user-preferences.service';
import { PublicProfileService } from './public-profile.service';
import { ActivityFeedService } from './activity-feed.service';
import { InProgressCoursesService } from './in-progress-courses.service';
import { RecommendedCoursesService } from './recommended-courses.service';
import { CompetencyGoalResolver } from './competency-goal.resolver';
import { CompetencyGoalService } from './competency-goal.service';

@Module({
  providers: [
    UserResolver,
    UserService,
    UserAdminService,
    UserStatsService,
    UserPreferencesService,
    PublicProfileService,
    ActivityFeedService,
    InProgressCoursesService,
    RecommendedCoursesService,
    CompetencyGoalResolver,
    CompetencyGoalService,
  ],
  exports: [
    UserService,
    UserAdminService,
    UserStatsService,
    UserPreferencesService,
    PublicProfileService,
    ActivityFeedService,
    InProgressCoursesService,
    RecommendedCoursesService,
  ],
})
export class UserModule {}
