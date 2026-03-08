import { Module } from '@nestjs/common';
import { ManagerResolver } from './manager.resolver';
import { ManagerDashboardService } from './manager-dashboard.service';

@Module({
  providers: [ManagerResolver, ManagerDashboardService],
  exports: [ManagerDashboardService],
})
export class ManagerModule {}
