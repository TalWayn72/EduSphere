import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { UserStatsService } from './user-stats.service';

@Module({
  providers: [UserResolver, UserService, UserStatsService],
  exports: [UserService, UserStatsService],
})
export class UserModule {}
