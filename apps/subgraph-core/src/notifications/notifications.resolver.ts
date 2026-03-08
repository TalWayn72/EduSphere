import {
  Resolver,
  Subscription,
  Mutation,
  Args,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { notificationPubSub } from './notifications.pubsub';
import type { Notification } from './nats-notification.bridge';
import type { AuthContext } from '@edusphere/auth';
import type { PushTokenService } from './push-token.service';
import type { PushTokenDto } from './push-token.service';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
  pushTokenService?: PushTokenService;
}

interface NotificationPayload {
  notificationReceived: Notification;
}

@Resolver('Notification')
export class NotificationsResolver {
  constructor(private readonly pushTokenService: PushTokenService) {}

  /**
   * Subscribe to real-time notifications for a specific user.
   *
   * Security: The JWT userId must match the requested userId to prevent
   * subscription hijacking — a client cannot subscribe to another user's
   * notification stream.
   */
  @Subscription('notificationReceived', {
    filter: (payload: NotificationPayload, variables: { userId: string }) =>
      payload.notificationReceived.userId === variables.userId,
  })
  notificationReceived(
    @Args('userId') userId: string,
    @Context() context: GraphQLContext
  ) {
    const authUserId = context.authContext?.userId;

    if (!authUserId) {
      throw new UnauthorizedException(
        'Authentication required for notifications subscription'
      );
    }

    if (authUserId !== userId) {
      throw new UnauthorizedException(
        "Cannot subscribe to another user's notifications"
      );
    }

    return notificationPubSub.subscribe(`notificationReceived.${userId}`);
  }

  /**
   * Register a push notification token for the authenticated user.
   * Returns a lightweight DTO (id, platform, createdAt) — token value is never returned.
   */
  @Mutation('registerPushToken')
  async registerPushToken(
    @Args('platform') platform: 'WEB' | 'IOS' | 'ANDROID',
    @Args('expoPushToken') expoPushToken: string | undefined,
    @Args('webPushSubscription') webPushSubscription: string | undefined,
    @Context() context: GraphQLContext
  ): Promise<PushTokenDto> {
    const authCtx = context.authContext;
    if (!authCtx?.userId || !authCtx.tenantId) {
      throw new UnauthorizedException(
        'Authentication required for push token registration'
      );
    }

    return this.pushTokenService.registerToken(
      authCtx.userId,
      authCtx.tenantId,
      platform,
      expoPushToken,
      webPushSubscription
    );
  }

  /**
   * Remove all registered push tokens for the authenticated user on a given platform.
   */
  @Mutation('unregisterPushToken')
  async unregisterPushToken(
    @Args('platform') platform: 'WEB' | 'IOS' | 'ANDROID',
    @Context() context: GraphQLContext
  ): Promise<boolean> {
    const authCtx = context.authContext;
    if (!authCtx?.userId || !authCtx.tenantId) {
      throw new UnauthorizedException(
        'Authentication required for push token unregistration'
      );
    }

    return this.pushTokenService.unregisterToken(
      authCtx.userId,
      authCtx.tenantId,
      platform
    );
  }
}
