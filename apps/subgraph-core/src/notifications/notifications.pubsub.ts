import { createPubSub } from 'graphql-yoga';
import type { Notification } from './nats-notification.bridge';

/**
 * Typed PubSub instance for notification events.
 *
 * Key pattern: `notificationReceived.<userId>`
 * Payload:     { notificationReceived: Notification }
 */
export type NotificationPubSub = ReturnType<
  typeof createPubSub<{
    [key: `notificationReceived.${string}`]: [
      { notificationReceived: Notification },
    ];
  }>
>;

export const notificationPubSub: NotificationPubSub = createPubSub<{
  [key: `notificationReceived.${string}`]: [
    { notificationReceived: Notification },
  ];
}>();

export const NOTIFICATION_PUB_SUB = Symbol('NOTIFICATION_PUB_SUB');
