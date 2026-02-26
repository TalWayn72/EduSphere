import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { UserStatsService } from './user-stats.service';
import { UserPreferencesService } from './user-preferences.service';
import { PublicProfileService } from './public-profile.service';

@Module({
  providers: [
    UserResolver,
    UserService,
    UserStatsService,
    UserPreferencesService,
    PublicProfileService,
  ],
  exports: [
    UserService,
    UserStatsService,
    UserPreferencesService,
    PublicProfileService,
  ],
})
export class UserModule {}
