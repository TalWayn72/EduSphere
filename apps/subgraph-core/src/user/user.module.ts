import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { UserStatsService } from './user-stats.service';
import { UserPreferencesService } from './user-preferences.service';

@Module({
  providers: [UserResolver, UserService, UserStatsService, UserPreferencesService],
  exports: [UserService, UserStatsService, UserPreferencesService],
})
export class UserModule {}
