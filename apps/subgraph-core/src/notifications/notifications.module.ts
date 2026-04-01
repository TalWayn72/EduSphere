import { Module } from '@nestjs/common';
import { NatsNotificationBridge } from './nats-notification.bridge';
import { NotificationsResolver } from './notifications.resolver';
import { PushTokenService } from './push-token.service';
import { PushDispatchService } from './push-dispatch.service';
import {
  notificationPubSub,
  NOTIFICATION_PUB_SUB,
} from './notifications.pubsub';
import type { NotificationPubSub } from './notifications.pubsub';
// Phase 65 — Multi-channel notification services
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesResolver } from './notification-preferences.resolver';
import { NotificationDeliveriesService } from './notification-deliveries.service';
import { NotificationRetryWorker } from './notification-retry.worker';
import { EmailChannelService } from './channels/email-channel.service';
import { EmailResendProvider } from './channels/email-resend.provider';
import { EmailSmtpProvider } from './channels/email-smtp.provider';
import { WhatsAppChannelService } from './channels/whatsapp-channel.service';
import { WhatsAppMetaProvider } from './channels/whatsapp-meta.provider';

/**
 * NotificationsModule wires up the full real-time notification pipeline:
 *
 *   NATS (badge.issued, course.enrolled, user.followed, srs.review.due,
 *         lesson.available, session.starting, streak.reminder, at.risk.alert)
 *     -> NatsNotificationBridge (transforms + publishes to in-process PubSub)
 *       -> notificationPubSub (graphql-yoga createPubSub)
 *         -> NotificationsResolver (GraphQL Subscription)
 *           -> Client (WebSocket)
 *
 *   Push delivery layer:
 *     NatsNotificationBridge -> PushDispatchService -> Expo / Web Push APIs
 *     GraphQL mutations (registerPushToken / unregisterPushToken)
 *       -> PushTokenService -> PostgreSQL (push_notification_tokens, RLS)
 *
 *   Phase 65 — Multi-channel delivery:
 *     NotificationDispatcherService -> Email / WhatsApp / Push channels
 *     NotificationPreferencesService -> User pref CRUD
 *     NotificationDeliveriesService -> Delivery history + analytics
 *     NotificationRetryWorker -> Failed delivery retry with exponential backoff
 */
@Module({
  providers: [
    {
      provide: NOTIFICATION_PUB_SUB,
      useValue: notificationPubSub,
    },
    PushTokenService,
    PushDispatchService,
    {
      provide: NatsNotificationBridge,
      useFactory: (
        pubSub: NotificationPubSub,
        pushDispatch: PushDispatchService,
        dispatcher: NotificationDispatcherService
      ) => new NatsNotificationBridge(pubSub, pushDispatch, dispatcher),
      inject: [
        NOTIFICATION_PUB_SUB,
        PushDispatchService,
        NotificationDispatcherService,
      ],
    },
    NotificationsResolver,
    // Phase 65 providers
    NotificationPreferencesService,
    NotificationPreferencesResolver,
    NotificationDeliveriesService,
    EmailResendProvider,
    EmailSmtpProvider,
    EmailChannelService,
    WhatsAppMetaProvider,
    WhatsAppChannelService,
    NotificationDispatcherService,
    NotificationRetryWorker,
  ],
  exports: [
    NatsNotificationBridge,
    PushTokenService,
    PushDispatchService,
    NotificationDispatcherService,
    NotificationPreferencesService,
    NotificationDeliveriesService,
    EmailChannelService,
    WhatsAppChannelService,
  ],
})
export class NotificationsModule {}
