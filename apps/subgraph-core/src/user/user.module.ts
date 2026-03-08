import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { UserStatsService } from './user-stats.service';
import { UserPreferencesService } from './user-preferences.service';
import { PublicProfileService } from './public-profile.service';
import { ActivityFeedService } from './activity-feed.service';
import { InProgressCoursesService } from './in-progress-courses.service';

@Module({
  providers: [
    UserResolver,
    UserService,
    UserStatsService,
    UserPreferencesService,
    PublicProfileService,
    ActivityFeedService,
    InProgressCoursesService,
  ],
  exports: [
    UserService,
    UserStatsService,
    UserPreferencesService,
    PublicProfileService,
    ActivityFeedService,
    InProgressCoursesService,
  ],
})
export class UserModule {}
