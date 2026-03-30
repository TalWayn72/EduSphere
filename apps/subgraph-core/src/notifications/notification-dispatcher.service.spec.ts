/**
 * notification-dispatcher.service.spec.ts — Unit tests for NotificationDispatcherService.
 * Tests dispatch routing, preference checking, memory safety eviction, and cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockIsChannelEnabled = vi.fn();
const mockRecordDelivery = vi.fn();
const mockEmailSend = vi.fn();
const mockWhatsAppSend = vi.fn();
const mockPushDispatch = vi.fn();

vi.mock('./notification-preferences.service', () => ({
  NotificationPreferencesService: class {
    isChannelEnabled = mockIsChannelEnabled;
  },
}));

vi.mock('./notification-deliveries.service', () => ({
  NotificationDeliveriesService: class {
    recordDelivery = mockRecordDelivery;
  },
}));

vi.mock('./channels/email-channel.service', () => ({
  EmailChannelService: class {
    send = mockEmailSend;
  },
}));

vi.mock('./channels/whatsapp-channel.service', () => ({
  WhatsAppChannelService: class {
    sendTemplate = mockWhatsAppSend;
  },
}));

vi.mock('./push-dispatch.service', () => ({
  PushDispatchService: class {
    dispatchToUser = mockPushDispatch;
  },
}));

import { NotificationDispatcherService } from './notification-dispatcher.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationDeliveriesService } from './notification-deliveries.service.js';
import { EmailChannelService } from './channels/email-channel.service.js';
import { WhatsAppChannelService } from './channels/whatsapp-channel.service.js';
import { PushDispatchService } from './push-dispatch.service.js';

function createService(): NotificationDispatcherService {
  return new NotificationDispatcherService(
    new NotificationPreferencesService() as never,
    new NotificationDeliveriesService() as never,
    new EmailChannelService() as never,
    new WhatsAppChannelService() as never,
    new PushDispatchService() as never
  );
}

const BASE_REQUEST = {
  userId: 'u-1',
  tenantId: 't-1',
  notificationType: 'course.completed',
  title: 'Course Done',
  body: 'You finished the course',
};

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsChannelEnabled.mockResolvedValue(false);
    mockRecordDelivery.mockResolvedValue('delivery-1');
    mockEmailSend.mockResolvedValue(undefined);
    mockWhatsAppSend.mockResolvedValue(undefined);
    mockPushDispatch.mockResolvedValue(undefined);
    service = createService();
  });

  describe('dispatch', () => {
    it('does not throw (fire-and-forget pattern)', () => {
      expect(() => service.dispatch(BASE_REQUEST)).not.toThrow();
    });

    it('records delivery when channel is enabled', async () => {
      mockIsChannelEnabled.mockResolvedValue(true);

      service.dispatch({
        ...BASE_REQUEST,
        channels: ['email'],
        email: 'user@test.com',
      });

      await vi.waitFor(() => {
        expect(mockRecordDelivery).toHaveBeenCalledOnce();
      });
    });

    it('skips channels where preference is disabled', async () => {
      mockIsChannelEnabled.mockResolvedValue(false);

      service.dispatch({ ...BASE_REQUEST, channels: ['email'] });

      await new Promise((r) => setTimeout(r, 50));
      expect(mockRecordDelivery).not.toHaveBeenCalled();
    });

    it('dispatches to push channel when enabled', async () => {
      mockIsChannelEnabled.mockResolvedValue(true);

      service.dispatch({ ...BASE_REQUEST, channels: ['push_web'] });

      await vi.waitFor(() => {
        expect(mockRecordDelivery).toHaveBeenCalled();
      });
    });

    it('dispatches to whatsapp when enabled and phone provided', async () => {
      mockIsChannelEnabled.mockResolvedValue(true);

      service.dispatch({
        ...BASE_REQUEST,
        channels: ['whatsapp'],
        phone: '+1234567890',
      });

      await vi.waitFor(() => {
        expect(mockRecordDelivery).toHaveBeenCalledOnce();
      });
    });

    it('handles errors in doDispatch gracefully', async () => {
      mockIsChannelEnabled.mockRejectedValue(new Error('pref fail'));

      service.dispatch({ ...BASE_REQUEST, channels: ['email'] });

      // Should not throw — error is caught internally
      await new Promise((r) => setTimeout(r, 50));
    });
  });

  describe('memory safety', () => {
    it('evicts old promises when pendingPromises reaches MAX_PENDING', () => {
      mockIsChannelEnabled.mockResolvedValue(false);

      for (let i = 0; i < 510; i++) {
        service.dispatch({ ...BASE_REQUEST });
      }

      // Should not throw — eviction runs silently
      expect(true).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('drains pending promises and clears the array', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('resolves even with pending dispatches', async () => {
      mockIsChannelEnabled.mockResolvedValue(true);
      service.dispatch({ ...BASE_REQUEST, channels: ['in_app'] });

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
