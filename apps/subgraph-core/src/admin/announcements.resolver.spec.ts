import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// Must mock before import
vi.mock('./announcements.service.js', () => ({
  AnnouncementsService: vi.fn(),
}));

import { AnnouncementsResolver } from './announcements.resolver.js';

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

describe('AnnouncementsResolver', () => {
  let resolver: AnnouncementsResolver;
  let svc: {
    getAdminAnnouncements: ReturnType<typeof vi.fn>;
    getActiveAnnouncements: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    svc = {
      getAdminAnnouncements: vi.fn(),
      getActiveAnnouncements: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      publish: vi.fn(),
    };
    resolver = new AnnouncementsResolver(svc as never);
  });

  // ── adminAnnouncements ──────────────────────────────────────────────────────

  describe('adminAnnouncements()', () => {
    it('delegates to service with tenantId and pagination', async () => {
      svc.getAdminAnnouncements.mockResolvedValue([]);
      await resolver.adminAnnouncements(10, 0, CTX_AUTHED);
      expect(svc.getAdminAnnouncements).toHaveBeenCalledWith('tenant-1', {
        limit: 10,
        offset: 0,
      });
    });

    it('uses defaults when limit/offset are falsy', async () => {
      svc.getAdminAnnouncements.mockResolvedValue([]);
      await resolver.adminAnnouncements(
        undefined as unknown as number,
        undefined as unknown as number,
        CTX_AUTHED
      );
      expect(svc.getAdminAnnouncements).toHaveBeenCalledWith('tenant-1', {
        limit: 20,
        offset: 0,
      });
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.adminAnnouncements(10, 0, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── activeAnnouncements ─────────────────────────────────────────────────────

  describe('activeAnnouncements()', () => {
    it('delegates to service with tenantId', async () => {
      svc.getActiveAnnouncements.mockResolvedValue([]);
      await resolver.activeAnnouncements(CTX_AUTHED);
      expect(svc.getActiveAnnouncements).toHaveBeenCalledWith('tenant-1');
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.activeAnnouncements(CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── createAnnouncement ──────────────────────────────────────────────────────

  describe('createAnnouncement()', () => {
    it('delegates to service with tenantId, userId, and input', async () => {
      const input = { title: 'Hello', body: 'World' };
      svc.create.mockResolvedValue({ id: 'ann-1', ...input });
      await resolver.createAnnouncement(input, CTX_AUTHED);
      expect(svc.create).toHaveBeenCalledWith('tenant-1', 'user-1', input);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.createAnnouncement({}, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── updateAnnouncement ──────────────────────────────────────────────────────

  describe('updateAnnouncement()', () => {
    it('delegates to service with id and input', async () => {
      const input = { title: 'Updated' };
      svc.update.mockResolvedValue({ id: 'ann-1', ...input });
      await resolver.updateAnnouncement('ann-1', input, CTX_AUTHED);
      expect(svc.update).toHaveBeenCalledWith('ann-1', input);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.updateAnnouncement('ann-1', {}, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── deleteAnnouncement ──────────────────────────────────────────────────────

  describe('deleteAnnouncement()', () => {
    it('delegates to service with id', async () => {
      svc.delete.mockResolvedValue(true);
      await resolver.deleteAnnouncement('ann-1', CTX_AUTHED);
      expect(svc.delete).toHaveBeenCalledWith('ann-1');
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.deleteAnnouncement('ann-1', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── publishAnnouncement ─────────────────────────────────────────────────────

  describe('publishAnnouncement()', () => {
    it('delegates to service with id', async () => {
      svc.publish.mockResolvedValue({ id: 'ann-1', published: true });
      await resolver.publishAnnouncement('ann-1', CTX_AUTHED);
      expect(svc.publish).toHaveBeenCalledWith('ann-1');
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.publishAnnouncement('ann-1', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
