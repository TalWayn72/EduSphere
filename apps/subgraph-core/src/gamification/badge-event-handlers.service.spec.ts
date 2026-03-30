import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadgeEventHandlersService } from './badge-event-handlers.service';
import type { BadgeAwardDelegate } from './badge-event-handlers.service';

/**
 * Helper: creates a mock NATS Subscription that yields a set of messages
 * then completes the async iterator.
 */
function createMockSub(messages: Array<Record<string, unknown>>) {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (index < messages.length) {
            const msg = messages[index++];
            return {
              done: false,
              value: { data: new TextEncoder().encode(JSON.stringify(msg)) },
            };
          }
          return { done: true, value: undefined };
        },
      };
    },
  } as any;
}

function createMockDelegate(): BadgeAwardDelegate {
  return {
    awardPoints: vi.fn().mockResolvedValue(undefined),
    checkAndAwardBadges: vi.fn().mockResolvedValue(undefined),
    countUserCourses: vi.fn().mockResolvedValue(5),
    countUserAnnotations: vi.fn().mockResolvedValue(10),
  };
}

describe('BadgeEventHandlersService', () => {
  let service: BadgeEventHandlersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BadgeEventHandlersService();
  });

  describe('handleCourseEvents', () => {
    it('awards points and checks badges on course.completed', async () => {
      const delegate = createMockDelegate();
      const sub = createMockSub([
        { userId: 'u1', tenantId: 't1', courseId: 'c1' },
      ]);
      await service.handleCourseEvents(sub, delegate);
      expect(delegate.awardPoints).toHaveBeenCalledWith(
        'u1', 't1', 'course.completed', 100, 'Course completed'
      );
      expect(delegate.countUserCourses).toHaveBeenCalledWith('u1', 't1');
      expect(delegate.checkAndAwardBadges).toHaveBeenCalledWith(
        'u1', 't1', 'courses_completed', 5
      );
    });

    it('handles multiple messages sequentially', async () => {
      const delegate = createMockDelegate();
      const sub = createMockSub([
        { userId: 'u1', tenantId: 't1' },
        { userId: 'u2', tenantId: 't1' },
      ]);
      await service.handleCourseEvents(sub, delegate);
      expect(delegate.awardPoints).toHaveBeenCalledTimes(2);
    });

    it('continues processing on individual message error', async () => {
      const delegate = createMockDelegate();
      delegate.awardPoints
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValue(undefined);
      const sub = createMockSub([
        { userId: 'u1', tenantId: 't1' },
        { userId: 'u2', tenantId: 't1' },
      ]);
      await service.handleCourseEvents(sub, delegate);
      // Second message should still be attempted
      expect(delegate.awardPoints).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleAnnotationEvents', () => {
    it('awards points for annotation.created', async () => {
      const delegate = createMockDelegate();
      const sub = createMockSub([
        { userId: 'u1', tenantId: 't1' },
      ]);
      await service.handleAnnotationEvents(sub, delegate);
      expect(delegate.awardPoints).toHaveBeenCalledWith(
        'u1', 't1', 'annotation.created', 10, 'Annotation created'
      );
      expect(delegate.countUserAnnotations).toHaveBeenCalledWith('u1', 't1');
      expect(delegate.checkAndAwardBadges).toHaveBeenCalledWith(
        'u1', 't1', 'annotations_created', 10
      );
    });

    it('handles parse errors gracefully', async () => {
      // Create a sub with invalid data
      const sub = {
        [Symbol.asyncIterator]() {
          let called = false;
          return {
            async next() {
              if (!called) {
                called = true;
                return {
                  done: false,
                  value: { data: new TextEncoder().encode('not json') },
                };
              }
              return { done: true, value: undefined };
            },
          };
        },
      } as any;
      const delegate = createMockDelegate();
      // Should not throw
      await service.handleAnnotationEvents(sub, delegate);
      expect(delegate.awardPoints).not.toHaveBeenCalled();
    });
  });

  describe('handleStreakEvents', () => {
    it('awards points for known streak milestone (7 days)', async () => {
      const delegate = createMockDelegate();
      const sub = createMockSub([
        { userId: 'u1', tenantId: 't1', streakDays: 7 },
      ]);
      await service.handleStreakEvents(sub, delegate);
      expect(delegate.awardPoints).toHaveBeenCalledWith(
        'u1', 't1', 'streak.milestone.7', 200, '7-day streak'
      );
      expect(delegate.checkAndAwardBadges).toHaveBeenCalledWith(
        'u1', 't1', 'streak_days', 7
      );
    });

    it('awards points for 30-day streak milestone', async () => {
      const delegate = createMockDelegate();
      const sub = createMockSub([
        { userId: 'u1', tenantId: 't1', streakDays: 30 },
      ]);
      await service.handleStreakEvents(sub, delegate);
      expect(delegate.awardPoints).toHaveBeenCalledWith(
        'u1', 't1', 'streak.milestone.30', 1000, '30-day streak'
      );
    });

    it('skips awardPoints for unknown streak milestones but still checks badges', async () => {
      const delegate = createMockDelegate();
      const sub = createMockSub([
        { userId: 'u1', tenantId: 't1', streakDays: 3 },
      ]);
      await service.handleStreakEvents(sub, delegate);
      // streak.milestone.3 has 0 points, so awardPoints should NOT be called
      expect(delegate.awardPoints).not.toHaveBeenCalled();
      // But badges should still be checked
      expect(delegate.checkAndAwardBadges).toHaveBeenCalledWith(
        'u1', 't1', 'streak_days', 3
      );
    });
  });
});
