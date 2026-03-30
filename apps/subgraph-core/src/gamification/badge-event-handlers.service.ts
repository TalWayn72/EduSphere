import { Injectable, Logger } from '@nestjs/common';
import type { Subscription } from 'nats';
import { POINT_AWARDS } from './badge-definitions.js';

interface NatsCoursePayload {
  userId: string;
  tenantId: string;
  courseId?: string;
}
interface NatsAnnotationPayload {
  userId: string;
  tenantId: string;
}
interface NatsStreakPayload {
  userId: string;
  tenantId: string;
  streakDays: number;
}

export interface BadgeAwardDelegate {
  awardPoints(
    userId: string,
    tenantId: string,
    eventType: string,
    points: number,
    description: string
  ): Promise<void>;
  checkAndAwardBadges(
    userId: string,
    tenantId: string,
    conditionType: string,
    newValue: number
  ): Promise<void>;
  countUserCourses(userId: string, tenantId: string): Promise<number>;
  countUserAnnotations(userId: string, tenantId: string): Promise<number>;
}

@Injectable()
export class BadgeEventHandlersService {
  private readonly logger = new Logger(BadgeEventHandlersService.name);

  async handleCourseEvents(
    sub: Subscription,
    delegate: BadgeAwardDelegate
  ): Promise<void> {
    for await (const msg of sub) {
      try {
        const p = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as NatsCoursePayload;
        const pts = POINT_AWARDS['course.completed'] ?? 0;
        await delegate.awardPoints(
          p.userId,
          p.tenantId,
          'course.completed',
          pts,
          'Course completed'
        );
        const count = await delegate.countUserCourses(p.userId, p.tenantId);
        await delegate.checkAndAwardBadges(
          p.userId,
          p.tenantId,
          'courses_completed',
          count
        );
      } catch (err) {
        this.logger.error({ err }, 'course.completed event error');
      }
    }
  }

  async handleAnnotationEvents(
    sub: Subscription,
    delegate: BadgeAwardDelegate
  ): Promise<void> {
    for await (const msg of sub) {
      try {
        const p = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as NatsAnnotationPayload;
        const pts = POINT_AWARDS['annotation.created'] ?? 0;
        await delegate.awardPoints(
          p.userId,
          p.tenantId,
          'annotation.created',
          pts,
          'Annotation created'
        );
        const count = await delegate.countUserAnnotations(p.userId, p.tenantId);
        await delegate.checkAndAwardBadges(
          p.userId,
          p.tenantId,
          'annotations_created',
          count
        );
      } catch (err) {
        this.logger.error({ err }, 'annotation.created event error');
      }
    }
  }

  async handleStreakEvents(
    sub: Subscription,
    delegate: BadgeAwardDelegate
  ): Promise<void> {
    for await (const msg of sub) {
      try {
        const p = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as NatsStreakPayload;
        const key = 'streak.milestone.' + String(p.streakDays);
        const pts =
          (Object.prototype.hasOwnProperty.call(POINT_AWARDS, key)
            ? POINT_AWARDS[key as keyof typeof POINT_AWARDS]
            : undefined) ?? 0;
        if (pts > 0)
          await delegate.awardPoints(
            p.userId,
            p.tenantId,
            key,
            pts,
            String(p.streakDays) + '-day streak'
          );
        await delegate.checkAndAwardBadges(
          p.userId,
          p.tenantId,
          'streak_days',
          p.streakDays
        );
      } catch (err) {
        this.logger.error({ err }, 'streak.milestone event error');
      }
    }
  }
}
