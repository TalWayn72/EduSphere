import { describe, it, expect } from 'vitest';
import {
  isNotificationDispatchEvent,
  isDeliveryStatusEvent,
  isAdminAlertEvent,
} from './notification-events';

describe('notification-events type guards', () => {
  describe('isNotificationDispatchEvent', () => {
    it('returns true for valid dispatch payload', () => {
      const payload = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        notificationType: 'BADGE_ISSUED',
        title: 'New Badge',
        body: 'You earned a badge',
        payload: {},
        channels: ['email', 'push_web'],
        timestamp: new Date().toISOString(),
      };
      expect(isNotificationDispatchEvent(payload)).toBe(true);
    });

    it('returns false for missing userId', () => {
      expect(
        isNotificationDispatchEvent({
          tenantId: 't',
          notificationType: 'X',
          channels: [],
        })
      ).toBe(false);
    });

    it('returns false for null', () => {
      expect(isNotificationDispatchEvent(null)).toBe(false);
    });

    it('returns false for non-array channels', () => {
      expect(
        isNotificationDispatchEvent({
          userId: 'u',
          tenantId: 't',
          notificationType: 'X',
          channels: 'email',
        })
      ).toBe(false);
    });
  });

  describe('isDeliveryStatusEvent', () => {
    it('returns true for valid delivery status', () => {
      const payload = {
        deliveryId: 'del-1',
        channel: 'email',
        status: 'delivered',
        externalId: 'ext-1',
        timestamp: new Date().toISOString(),
      };
      expect(isDeliveryStatusEvent(payload)).toBe(true);
    });

    it('returns false for missing deliveryId', () => {
      expect(isDeliveryStatusEvent({ channel: 'email', status: 'sent' })).toBe(
        false
      );
    });
  });

  describe('isAdminAlertEvent', () => {
    it('returns true for valid admin alert', () => {
      const payload = {
        tenantId: 'tenant-1',
        alertType: 'enrollment_spike',
        severity: 'warning',
        title: 'High Enrollment',
        body: '50 new enrollments in 1 hour',
        metadata: { count: 50 },
        timestamp: new Date().toISOString(),
      };
      expect(isAdminAlertEvent(payload)).toBe(true);
    });

    it('returns false for missing severity', () => {
      expect(
        isAdminAlertEvent({ tenantId: 't', alertType: 'system_health' })
      ).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAdminAlertEvent(undefined)).toBe(false);
    });
  });
});
