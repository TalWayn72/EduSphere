/**
 * WhatsAppModule — Phase 65.
 * Wires up WhatsApp registration, verification, and admin alerts.
 * Imports NotificationsModule for WhatsAppChannelService access.
 */
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppRegistrationService } from './whatsapp-registration.service';
import { WhatsAppRegistrationResolver } from './whatsapp-registration.resolver';
import { AdminAlertsService } from './admin-alerts.service';

@Module({
  imports: [NotificationsModule],
  providers: [
    WhatsAppRegistrationService,
    WhatsAppRegistrationResolver,
    AdminAlertsService,
  ],
  exports: [WhatsAppRegistrationService],
})
export class WhatsAppModule {}
