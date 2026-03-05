import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./notification-templates.service.js', () => ({
  NotificationTemplatesService: vi.fn(),
}));

import { NotificationTemplatesResolver } from './notification-templates.resolver.js';

const TEMPLATE_ROW = {
  id: 'tpl-1',
  key: 'welcome',
  name: 'Welcome Email',
  subject: 'Welcome to {{tenant.name}}!',
  bodyHtml: '<h1>Welcome</h1>',
  variables: ['user.name', 'tenant.name'],
  isActive: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const CTX_AUTHED = {
  req: {},
  authContext: {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['ORG_ADMIN'],
    scopes: [],
  },
};

const CTX_ANON = { req: {}, authContext: undefined };

describe('NotificationTemplatesResolver', () => {
  let resolver: NotificationTemplatesResolver;
  let svc: {
    getTemplates: ReturnType<typeof vi.fn>;
    updateTemplate: ReturnType<typeof vi.fn>;
    resetTemplate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    svc = {
      getTemplates: vi.fn(),
      updateTemplate: vi.fn(),
      resetTemplate: vi.fn(),
    };
    resolver = new NotificationTemplatesResolver(svc as never);
  });

  // ── adminNotificationTemplates ───────────────────────────────────────────────

  describe('adminNotificationTemplates()', () => {
    it('delegates to service with tenantId', async () => {
      svc.getTemplates.mockResolvedValue([TEMPLATE_ROW]);
      const result = await resolver.adminNotificationTemplates(CTX_AUTHED);
      expect(svc.getTemplates).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual([TEMPLATE_ROW]);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.adminNotificationTemplates(CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates service errors', async () => {
      svc.getTemplates.mockRejectedValue(new Error('DB error'));
      await expect(
        resolver.adminNotificationTemplates(CTX_AUTHED)
      ).rejects.toThrow('DB error');
    });
  });

  // ── updateNotificationTemplate ───────────────────────────────────────────────

  describe('updateNotificationTemplate()', () => {
    it('delegates to service with id, input, and tenantId', async () => {
      const input = { subject: 'New Subject', isActive: false };
      svc.updateTemplate.mockResolvedValue({ ...TEMPLATE_ROW, ...input });
      await resolver.updateNotificationTemplate('tpl-1', input, CTX_AUTHED);
      expect(svc.updateTemplate).toHaveBeenCalledWith('tpl-1', input, 'tenant-1');
    });

    it('returns the updated template', async () => {
      const updated = { ...TEMPLATE_ROW, subject: 'Updated' };
      svc.updateTemplate.mockResolvedValue(updated);
      const result = await resolver.updateNotificationTemplate(
        'tpl-1',
        { subject: 'Updated' },
        CTX_AUTHED
      );
      expect(result).toEqual(updated);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.updateNotificationTemplate('tpl-1', {}, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates service errors', async () => {
      svc.updateTemplate.mockRejectedValue(new Error('Not found'));
      await expect(
        resolver.updateNotificationTemplate('tpl-1', {}, CTX_AUTHED)
      ).rejects.toThrow('Not found');
    });
  });

  // ── resetNotificationTemplate ────────────────────────────────────────────────

  describe('resetNotificationTemplate()', () => {
    it('delegates to service with id and tenantId', async () => {
      svc.resetTemplate.mockResolvedValue(TEMPLATE_ROW);
      await resolver.resetNotificationTemplate('tpl-1', CTX_AUTHED);
      expect(svc.resetTemplate).toHaveBeenCalledWith('tpl-1', 'tenant-1');
    });

    it('returns the reset template', async () => {
      svc.resetTemplate.mockResolvedValue(TEMPLATE_ROW);
      const result = await resolver.resetNotificationTemplate('tpl-1', CTX_AUTHED);
      expect(result).toEqual(TEMPLATE_ROW);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.resetNotificationTemplate('tpl-1', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates service errors', async () => {
      svc.resetTemplate.mockRejectedValue(new Error('Reset failed'));
      await expect(
        resolver.resetNotificationTemplate('tpl-1', CTX_AUTHED)
      ).rejects.toThrow('Reset failed');
    });
  });
});
