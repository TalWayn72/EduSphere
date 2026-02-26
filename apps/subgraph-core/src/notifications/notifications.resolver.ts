import { Resolver, Subscription, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { notificationPubSub } from './notifications.pubsub';
import type { Notification } from './nats-notification.bridge';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

interface NotificationPayload {
  notificationReceived: Notification;
}

@Resolver('Notification')
export class NotificationsResolver {
  /**
   * Subscribe to real-time notifications for a specific user.
   *
   * Security: The JWT userId must match the requested userId to prevent
   * subscription hijacking — a client cannot subscribe to another user's
   * notification stream.
   */
  @Subscription('notificationReceived', {
    filter: (
      payload: NotificationPayload,
      variables: { userId: string },
    ) => payload.notificationReceived.userId === variables.userId,
  })
  notificationReceived(
    @Args('userId') userId: string,
    @Context() context: GraphQLContext,
  ) {
    const authUserId = context.authContext?.userId;

    if (!authUserId) {
      throw new UnauthorizedException('Authentication required for notifications subscription');
    }

    if (authUserId !== userId) {
      throw new UnauthorizedException('Cannot subscribe to another user\'s notifications');
    }

    return notificationPubSub.subscribe(`notificationReceived.${userId}`);
  }
}
