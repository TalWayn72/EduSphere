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
import type { PushDispatchService } from './push-dispatch.service';

export type NotificationType =
  | 'BADGE_ISSUED'
  | 'COURSE_ENROLLED'
  | 'USER_FOLLOWED'
  | 'SRS_REVIEW_DUE'
  | 'ANNOUNCEMENT'
  | 'LESSON_AVAILABLE'
  | 'SESSION_STARTING'
  | 'STREAK_REMINDER'
  | 'AT_RISK_ALERT'
  // Phase 45 — Social Learning
  | 'PEER_REVIEW_ASSIGNED'
  | 'PEER_REVIEW_RECEIVED'
  | 'DISCUSSION_REPLY'
  | 'PEER_FOLLOWED_ACTIVITY';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  /** Exposed in GraphQL as Notification.userId and used for PubSub routing. */
  userId: string;
}

/** Map NATS subjects to notification types and human-readable titles. */
const SUBJECT_MAP: Record<
  string,
  {
    type: NotificationType;
    title: (raw: Record<string, unknown>) => string;
    body: (raw: Record<string, unknown>) => string;
  }
> = {
  'badge.issued': {
    type: 'BADGE_ISSUED',
    title: () => 'New Badge Earned!',
    body: (raw) =>
      `You earned a new badge: ${String(raw['badgeName'] ?? 'Achievement')}.`,
  },
  'course.enrolled': {
    type: 'COURSE_ENROLLED',
    title: () => 'Course Enrollment',
    body: (raw) =>
      `You have been enrolled in ${String(raw['courseName'] ?? 'a new course')}.`,
  },
  'user.followed': {
    type: 'USER_FOLLOWED',
    title: () => 'New Follower',
    body: (raw) =>
      `${String(raw['followerName'] ?? 'Someone')} started following you.`,
  },
  'srs.review.due': {
    type: 'SRS_REVIEW_DUE',
    title: () => 'Review Due',
    body: (raw) =>
      `You have ${String(raw['cardCount'] ?? 'some')} cards ready for review.`,
  },
  'EDUSPHERE.notification.announcement': {
    type: 'ANNOUNCEMENT',
    title: (raw) => String(raw['title'] ?? 'New Announcement'),
    body: (raw) => String(raw['body'] ?? ''),
  },
  'EDUSPHERE.lesson.available': {
    type: 'LESSON_AVAILABLE',
    title: () => 'New Lesson Available',
    body: (raw) =>
      `A new lesson is ready: ${String(raw['lessonTitle'] ?? 'Untitled Lesson')}.`,
  },
  'EDUSPHERE.session.starting': {
    type: 'SESSION_STARTING',
    title: () => 'Live Session Starting Soon',
    body: (raw) =>
      `Your session "${String(raw['sessionTitle'] ?? 'Untitled Session')}" starts in ${String(raw['minutesUntilStart'] ?? '5')} minutes.`,
  },
  'EDUSPHERE.streak.reminder': {
    type: 'STREAK_REMINDER',
    title: () => 'Keep Your Streak Going!',
    body: (raw) =>
      `You have a ${String(raw['streakDays'] ?? '0')}-day streak — don't break it today.`,
  },
  'EDUSPHERE.at.risk.alert': {
    type: 'AT_RISK_ALERT',
    title: () => 'Learning Progress Alert',
    body: (raw) =>
      `Your progress in "${String(raw['courseName'] ?? 'a course')}" needs attention.`,
  },
  // Phase 45 — Social Learning notification subjects
  'EDUSPHERE.peer.review.assigned': {
    type: 'PEER_REVIEW_ASSIGNED',
    title: () => 'Peer Review Assigned',
    body: (raw) =>
      `You have been assigned to review "${String(raw['contentItemTitle'] ?? 'a submission')}".`,
  },
  'EDUSPHERE.peer.review.completed': {
    type: 'PEER_REVIEW_RECEIVED',
    title: () => 'Peer Review Received',
    body: (raw) =>
      `Your submission "${String(raw['contentItemTitle'] ?? 'your work')}" has received a peer review.`,
  },
  'EDUSPHERE.discussion.reply': {
    type: 'DISCUSSION_REPLY',
    title: () => 'New Reply in Discussion',
    body: (raw) =>
      `Someone replied in "${String(raw['discussionTitle'] ?? 'a discussion')}".`,
  },
  'EDUSPHERE.social.activity.digest': {
    type: 'PEER_FOLLOWED_ACTIVITY',
    title: () => 'Following Activity',
    body: (raw) =>
      `${String(raw['actorName'] ?? 'Someone you follow')} has new activity on EduSphere.`,
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

  constructor(
    private readonly pubSub: NotificationPubSub,
    private readonly pushDispatch: PushDispatchService
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      const opts = buildNatsOptions();
      this.connection = await connect(opts);
      this.logger.log('NatsNotificationBridge connected to NATS');
      await this.registerSubscriptions();
    } catch (err) {
      this.logger.error(
        'Failed to connect NatsNotificationBridge to NATS',
        err
      );
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
    sub: Subscription
  ): Promise<void> {
    // eslint-disable-next-line security/detect-object-injection -- subject is always a key from Object.keys(SUBJECT_MAP)
    const mapping = SUBJECT_MAP[subject];
    if (!mapping) return;

    for await (const msg of sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as Record<
          string,
          unknown
        >;
        const userId = String(raw['userId'] ?? '');

        if (!userId) {
          this.logger.warn(
            `Received ${subject} event without userId — skipping`
          );
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

        // Fire-and-forget push dispatch — never blocks WebSocket pipeline.
        const tenantId = String(raw['tenantId'] ?? '');
        if (tenantId) {
          void this.pushDispatch
            .dispatchToUser(
              userId,
              tenantId,
              notification.title,
              notification.body,
              notification.payload ?? undefined
            )
            .catch((err: unknown) => {
              this.logger.error(
                `[NatsNotificationBridge] Push dispatch error — userId=${userId}`,
                err
              );
            });
        }

        this.logger.debug(
          `Published notification ${notification.type} for user ${userId}`
        );
      } catch (err) {
        this.logger.error(`Error processing NATS message on ${subject}`, err);
      }
    }
  }
}
