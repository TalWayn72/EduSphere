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

/**
 * NotificationsModule wires up the full real-time notification pipeline:
 *
 *   NATS (badge.issued, course.enrolled, user.followed, srs.review.due,
 *         lesson.available, session.starting, streak.reminder, at.risk.alert)
 *     → NatsNotificationBridge (transforms + publishes to in-process PubSub)
 *       → notificationPubSub (graphql-yoga createPubSub)
 *         → NotificationsResolver (GraphQL Subscription)
 *           → Client (WebSocket)
 *
 *   Push delivery layer:
 *     NatsNotificationBridge → PushDispatchService → Expo / Web Push APIs
 *     GraphQL mutations (registerPushToken / unregisterPushToken)
 *       → PushTokenService → PostgreSQL (push_notification_tokens, RLS)
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
        pushDispatch: PushDispatchService
      ) => new NatsNotificationBridge(pubSub, pushDispatch),
      inject: [NOTIFICATION_PUB_SUB, PushDispatchService],
    },
    NotificationsResolver,
  ],
  exports: [NatsNotificationBridge, PushTokenService, PushDispatchService],
})
export class NotificationsModule {}
