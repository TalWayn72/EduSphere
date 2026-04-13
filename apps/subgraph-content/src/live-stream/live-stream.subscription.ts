/**
 * LiveStreamSubscriptionResolver — GraphQL Subscription resolvers for live stream events.
 *
 * Bridges NATS events to GraphQL subscriptions using the nats-pubsub.helper.
 * Three subscription types:
 *   - liveTranscriptUpdated: real-time transcript segments
 *   - livePresenceChanged: viewer presence count updates
 *   - liveSessionStatusChanged: session lifecycle status changes
 */
import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import {
  subscribeTranscript,
  subscribePresence,
  subscribeSessionStatus,
} from './nats-pubsub.helper';

@Resolver('LiveStreamSubscription')
export class LiveStreamSubscriptionResolver {
  private readonly logger = new Logger(LiveStreamSubscriptionResolver.name);

  /**
   * Subscribe to real-time transcript segments for a live session.
   * NATS subject: EDUSPHERE.live.transcript.segment
   */
  @Subscription('liveTranscriptUpdated')
  subscribeTranscript(
    @Args('sessionId') sessionId: string
  ) {
    this.logger.debug(`[Subscription] liveTranscriptUpdated for session ${sessionId}`);
    return subscribeTranscript(sessionId);
  }

  /**
   * Subscribe to presence count changes for a live session.
   * NATS subject: EDUSPHERE.live.presence.count
   */
  @Subscription('livePresenceChanged')
  subscribePresence(
    @Args('sessionId') sessionId: string
  ) {
    this.logger.debug(`[Subscription] livePresenceChanged for session ${sessionId}`);
    return subscribePresence(sessionId);
  }

  /**
   * Subscribe to session status lifecycle changes (LIVE, PAUSED, ENDED).
   * NATS subjects: EDUSPHERE.live.stream.*
   */
  @Subscription('liveSessionStatusChanged')
  subscribeSessionStatus(
    @Args('sessionId') sessionId: string
  ) {
    this.logger.debug(`[Subscription] liveSessionStatusChanged for session ${sessionId}`);
    return subscribeSessionStatus(sessionId);
  }
}
