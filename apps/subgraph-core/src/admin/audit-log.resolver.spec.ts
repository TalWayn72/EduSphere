import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./audit-log.service.js', () => ({
  AuditLogService: vi.fn(),
}));

import { AuditLogResolver } from './audit-log.resolver.js';

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

describe('AuditLogResolver', () => {
  let resolver: AuditLogResolver;
  let auditLogService: {
    getAuditLog: ReturnType<typeof vi.fn>;
    exportAuditLog: ReturnType<typeof vi.fn>;
    scheduleGdprErasure: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auditLogService = {
      getAuditLog: vi.fn(),
      exportAuditLog: vi.fn(),
      scheduleGdprErasure: vi.fn(),
    };
    resolver = new AuditLogResolver(auditLogService as never);
  });

  // ── getAdminAuditLog ────────────────────────────────────────────────────────

  describe('getAdminAuditLog()', () => {
    it('delegates to service with tenantId and filter params', async () => {
      auditLogService.getAuditLog.mockResolvedValue([]);
      await resolver.getAdminAuditLog(
        50, 0, 'LOGIN', 'user-2', '2026-01-01', '2026-02-01', CTX_AUTHED
      );
      expect(auditLogService.getAuditLog).toHaveBeenCalledWith('tenant-1', {
        limit: 50,
        offset: 0,
        action: 'LOGIN',
        userId: 'user-2',
        since: '2026-01-01',
        until: '2026-02-01',
      });
    });

    it('uses defaults when limit/offset are falsy', async () => {
      auditLogService.getAuditLog.mockResolvedValue([]);
      await resolver.getAdminAuditLog(
        undefined as unknown as number,
        undefined as unknown as number,
        undefined,
        undefined,
        undefined,
        undefined,
        CTX_AUTHED
      );
      expect(auditLogService.getAuditLog).toHaveBeenCalledWith('tenant-1', {
        limit: 50,
        offset: 0,
        action: undefined,
        userId: undefined,
        since: undefined,
        until: undefined,
      });
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.getAdminAuditLog(10, 0, undefined, undefined, undefined, undefined, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── exportAuditLog ──────────────────────────────────────────────────────────

  describe('exportAuditLog()', () => {
    it('delegates to service with tenantId, date range, and format', async () => {
      auditLogService.exportAuditLog.mockResolvedValue('url://file.csv');
      await resolver.exportAuditLog(
        '2026-01-01', '2026-02-01', 'CSV', CTX_AUTHED
      );
      expect(auditLogService.exportAuditLog).toHaveBeenCalledWith(
        'tenant-1', '2026-01-01', '2026-02-01', 'CSV'
      );
    });

    it('defaults format to CSV when falsy', async () => {
      auditLogService.exportAuditLog.mockResolvedValue('url://file.csv');
      await resolver.exportAuditLog(
        '2026-01-01',
        '2026-02-01',
        undefined as unknown as 'CSV',
        CTX_AUTHED
      );
      expect(auditLogService.exportAuditLog).toHaveBeenCalledWith(
        'tenant-1', '2026-01-01', '2026-02-01', 'CSV'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.exportAuditLog('2026-01-01', '2026-02-01', 'JSON', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── scheduleGdprErasure ─────────────────────────────────────────────────────

  describe('scheduleGdprErasure()', () => {
    it('calls service and returns true', async () => {
      auditLogService.scheduleGdprErasure.mockResolvedValue(undefined);
      const result = await resolver.scheduleGdprErasure('user-99', CTX_AUTHED);
      expect(result).toBe(true);
      expect(auditLogService.scheduleGdprErasure).toHaveBeenCalledWith(
        'user-99', 'tenant-1'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.scheduleGdprErasure('user-99', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
