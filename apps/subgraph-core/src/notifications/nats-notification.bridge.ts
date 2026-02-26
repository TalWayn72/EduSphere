import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type { NotificationPubSub } from './notifications.pubsub';

export type NotificationType =
  | 'BADGE_ISSUED'
  | 'COURSE_ENROLLED'
  | 'USER_FOLLOWED'
  | 'SRS_REVIEW_DUE'
  | 'ANNOUNCEMENT';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  /** Internal — used for routing; not exposed in GraphQL. */
  userId: string;
}

/** Map NATS subjects to notification types and human-readable titles. */
const SUBJECT_MAP: Record<
  string,
  { type: NotificationType; title: (raw: Record<string, unknown>) => string; body: (raw: Record<string, unknown>) => string }
> = {
  'badge.issued': {
    type: 'BADGE_ISSUED',
    title: () => 'New Badge Earned!',
    body: (raw) => `You earned a new badge: ${String(raw['badgeName'] ?? 'Achievement')}.`,
  },
  'course.enrolled': {
    type: 'COURSE_ENROLLED',
    title: () => 'Course Enrollment',
    body: (raw) => `You have been enrolled in ${String(raw['courseName'] ?? 'a new course')}.`,
  },
  'user.followed': {
    type: 'USER_FOLLOWED',
    title: () => 'New Follower',
    body: (raw) => `${String(raw['followerName'] ?? 'Someone')} started following you.`,
  },
  'srs.review.due': {
    type: 'SRS_REVIEW_DUE',
    title: () => 'Review Due',
    body: (raw) => `You have ${String(raw['cardCount'] ?? 'some')} cards ready for review.`,
  },
};

/**
 * NatsNotificationBridge subscribes to NATS subjects for notification events,
 * transforms each event into a Notification shape, then publishes it on the
 * in-process GraphQL PubSub so that active GraphQL subscriptions receive it.
 *
 * Memory safety:
 *  - All NATS Subscription handles are stored in _subs and unsubscribed in
 *    onModuleDestroy() before draining the connection.
 */
@Injectable()
export class NatsNotificationBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsNotificationBridge.name);
  private readonly sc = StringCodec();
  private connection: NatsConnection | null = null;

  /** Tracks every NATS Subscription so they can all be closed on destroy. */
  private readonly _subs: Subscription[] = [];

  constructor(private readonly pubSub: NotificationPubSub) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      const opts = buildNatsOptions();
      this.connection = await connect(opts);
      this.logger.log('NatsNotificationBridge connected to NATS');
      await this.registerSubscriptions();
    } catch (err) {
      this.logger.error('Failed to connect NatsNotificationBridge to NATS', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Unsubscribe all tracked NATS subscriptions (memory safety rule).
    for (const sub of this._subs) {
      sub.unsubscribe();
    }
    this._subs.length = 0;

    if (this.connection) {
      await this.connection.drain();
      this.connection = null;
      this.logger.log('NatsNotificationBridge NATS connection closed');
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async registerSubscriptions(): Promise<void> {
    if (!this.connection) return;

    for (const subject of Object.keys(SUBJECT_MAP)) {
      const sub = this.connection.subscribe(subject);
      this._subs.push(sub);
      this.logger.debug(`Subscribed to NATS subject: ${subject}`);

      // Process messages asynchronously; the loop exits when sub is drained.
      void this.processMessages(subject, sub);
    }
  }

  private async processMessages(
    subject: string,
    sub: Subscription,
  ): Promise<void> {
    const mapping = SUBJECT_MAP[subject];
    if (!mapping) return;

    for await (const msg of sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as Record<string, unknown>;
        const userId = String(raw['userId'] ?? '');

        if (!userId) {
          this.logger.warn(`Received ${subject} event without userId — skipping`);
          continue;
        }

        const notification: Notification = {
          id: crypto.randomUUID(),
          type: mapping.type,
          title: mapping.title(raw),
          body: mapping.body(raw),
          payload: raw,
          readAt: null,
          createdAt: new Date().toISOString(),
          userId,
        };

        this.pubSub.publish(`notificationReceived.${userId}`, {
          notificationReceived: notification,
        });

        this.logger.debug(
          `Published notification ${notification.type} for user ${userId}`,
        );
      } catch (err) {
        this.logger.error(`Error processing NATS message on ${subject}`, err);
      }
    }
  }
}
