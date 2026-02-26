import { Module } from '@nestjs/common';
import { NatsNotificationBridge } from './nats-notification.bridge';
import { NotificationsResolver } from './notifications.resolver';
import {
  notificationPubSub,
  NOTIFICATION_PUB_SUB,
} from './notifications.pubsub';
import type { NotificationPubSub } from './notifications.pubsub';

/**
 * NotificationsModule wires up the full real-time notification pipeline:
 *
 *   NATS (badge.issued, course.enrolled, user.followed, srs.review.due)
 *     → NatsNotificationBridge (transforms + publishes to in-process PubSub)
 *       → notificationPubSub (graphql-yoga createPubSub)
 *         → NotificationsResolver (GraphQL Subscription)
 *           → Client (WebSocket)
 */
@Module({
  providers: [
    {
      provide: NOTIFICATION_PUB_SUB,
      useValue: notificationPubSub,
    },
    {
      provide: NatsNotificationBridge,
      useFactory: (pubSub: NotificationPubSub) =>
        new NatsNotificationBridge(pubSub),
      inject: [NOTIFICATION_PUB_SUB],
    },
    NotificationsResolver,
  ],
  exports: [NatsNotificationBridge],
})
export class NotificationsModule {}
