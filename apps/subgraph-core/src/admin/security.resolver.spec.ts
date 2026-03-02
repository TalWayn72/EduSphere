import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./security.service.js', () => ({
  SecurityService: vi.fn(),
}));

import { SecurityResolver } from './security.resolver.js';

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

const MOCK_SETTINGS = {
  mfaRequired: true,
  allowedIpRanges: ['10.0.0.0/8'],
  sessionTimeoutMinutes: 60,
};

describe('SecurityResolver', () => {
  let resolver: SecurityResolver;
  let svc: {
    getSettings: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    svc = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    };
    resolver = new SecurityResolver(svc as never);
  });

  // ── mySecuritySettings ──────────────────────────────────────────────────────

  describe('mySecuritySettings()', () => {
    it('delegates to service with tenantId', async () => {
      svc.getSettings.mockResolvedValue(MOCK_SETTINGS);
      const result = await resolver.mySecuritySettings(CTX_AUTHED);
      expect(svc.getSettings).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual(MOCK_SETTINGS);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.mySecuritySettings(CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('propagates service errors', async () => {
      svc.getSettings.mockRejectedValue(new Error('DB error'));
      await expect(resolver.mySecuritySettings(CTX_AUTHED)).rejects.toThrow(
        'DB error'
      );
    });
  });

  // ── updateSecuritySettings ──────────────────────────────────────────────────

  describe('updateSecuritySettings()', () => {
    it('delegates to service with tenantId and input', async () => {
      const input = { mfaRequired: false, sessionTimeoutMinutes: 30 };
      svc.updateSettings.mockResolvedValue({ ...MOCK_SETTINGS, ...input });
      await resolver.updateSecuritySettings(input, CTX_AUTHED);
      expect(svc.updateSettings).toHaveBeenCalledWith('tenant-1', input);
    });

    it('returns the updated settings from service', async () => {
      const updated = { mfaRequired: false };
      svc.updateSettings.mockResolvedValue(updated);
      const result = await resolver.updateSecuritySettings(updated, CTX_AUTHED);
      expect(result).toEqual(updated);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.updateSecuritySettings({}, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates service errors', async () => {
      svc.updateSettings.mockRejectedValue(new Error('Update failed'));
      await expect(
        resolver.updateSecuritySettings({}, CTX_AUTHED)
      ).rejects.toThrow('Update failed');
    });
  });
});
