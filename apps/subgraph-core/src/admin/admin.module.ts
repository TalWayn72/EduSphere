import { Module } from '@nestjs/common';
import { AdminOverviewResolver } from './admin-overview.resolver';
import { AdminOverviewService } from './admin-overview.service';
import { AuditLogResolver } from './audit-log.resolver';
import { AuditLogService } from './audit-log.service';
import { AnnouncementsResolver } from './announcements.resolver';
import { AnnouncementsService } from './announcements.service';
import { SecurityResolver } from './security.resolver';
import { SecurityService } from './security.service';

@Module({
  providers: [
    AdminOverviewResolver,
    AdminOverviewService,
    AuditLogResolver,
    AuditLogService,
    AnnouncementsResolver,
    AnnouncementsService,
    SecurityResolver,
    SecurityService,
  ],
  exports: [AdminOverviewService],
})
export class AdminModule {}
