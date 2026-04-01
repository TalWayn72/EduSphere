import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @edusphere/db before the service is imported
// ---------------------------------------------------------------------------
const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
const mockInsertValues = vi
  .fn()
  .mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectWhere = vi
  .fn()
  .mockResolvedValue([{ id: 'consent-1', given: true }]);
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockTx = {
  select: vi.fn().mockReturnValue({ from: mockSelectFrom }),
  insert: mockInsert,
};
const mockDb = {
  select: mockSelect,
  insert: mockInsert,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    userConsents: {
      userId: 'userId',
      consentType: 'consentType',
      given: 'given',
    },
    auditLog: {},
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_db, _ctx, cb) => cb(mockTx)),
}));

import { ConsentService } from './consent.service.js';
import { withTenantContext } from '@edusphere/db';

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(() => {
    service = new ConsentService();
    vi.clearAllMocks();

    // Reset default mocks after clear
    mockSelectWhere.mockResolvedValue([{ id: 'consent-1', given: true }]);
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockInsertValues.mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  describe('hasConsent', () => {
    it('ESSENTIAL consent is always true without DB check', async () => {
      const result = await service.hasConsent(
        'user-1',
        'tenant-1',
        'ESSENTIAL'
      );
      expect(result).toBe(true);
    });

    it('returns true when consent row exists and given=true', async () => {
      const result = await service.hasConsent(
        'user-1',
        'tenant-1',
        'AI_PROCESSING'
      );
      expect(result).toBe(true);
    });

    it('returns false when no consent row exists', async () => {
      mockSelectWhere.mockResolvedValueOnce([]);

      const result = await service.hasConsent(
        'user-1',
        'tenant-1',
        'THIRD_PARTY_LLM'
      );
      expect(result).toBe(false);
    });

    it('returns false for MARKETING when no row exists', async () => {
      mockSelectWhere.mockResolvedValueOnce([]);
      const result = await service.hasConsent(
        'user-1',
        'tenant-1',
        'MARKETING'
      );
      expect(result).toBe(false);
    });
  });

  describe('updateConsent', () => {
    it('calls insert with onConflictDoUpdate (upsert)', async () => {
      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'AI_PROCESSING',
        given: true,
      });
      expect(mockInsert).toHaveBeenCalled();
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });

    it('writes CONSENT_GIVEN audit log on grant', async () => {
      // Insert called twice: once for userConsents, once for auditLog
      let callCount = 0;
      let capturedAuditValues: Record<string, unknown> | null = null;

      mockInsert.mockImplementation(() => ({
        values: (vals: Record<string, unknown>) => {
          callCount++;
          if (callCount === 2) capturedAuditValues = vals;
          return { onConflictDoUpdate: mockOnConflictDoUpdate };
        },
      }));

      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'AI_PROCESSING',
        given: true,
      });

      expect(capturedAuditValues).toMatchObject({ action: 'CONSENT_GIVEN' });
    });

    it('writes CONSENT_WITHDRAWN audit log on revoke', async () => {
      let callCount = 0;
      let capturedAuditValues: Record<string, unknown> | null = null;

      mockInsert.mockImplementation(() => ({
        values: (vals: Record<string, unknown>) => {
          callCount++;
          if (callCount === 2) capturedAuditValues = vals;
          return { onConflictDoUpdate: mockOnConflictDoUpdate };
        },
      }));

      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'MARKETING',
        given: false,
      });

      expect(capturedAuditValues).toMatchObject({
        action: 'CONSENT_WITHDRAWN',
      });
    });

    it('audit log metadata includes gdprArticle 7', async () => {
      let callCount = 0;
      let capturedAuditValues: Record<string, unknown> | null = null;

      mockInsert.mockImplementation(() => ({
        values: (vals: Record<string, unknown>) => {
          callCount++;
          if (callCount === 2) capturedAuditValues = vals;
          return { onConflictDoUpdate: mockOnConflictDoUpdate };
        },
      }));

      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'ANALYTICS',
        given: true,
      });

      expect(
        (capturedAuditValues?.metadata as Record<string, unknown>)?.gdprArticle
      ).toBe('7');
    });

    it('uses default consentVersion 1.0 when not provided', async () => {
      let capturedConsentValues: Record<string, unknown> | null = null;

      mockInsert.mockImplementation(() => ({
        values: (vals: Record<string, unknown>) => {
          if (!capturedConsentValues) capturedConsentValues = vals;
          return { onConflictDoUpdate: mockOnConflictDoUpdate };
        },
      }));

      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'RESEARCH',
        given: true,
      });

      expect(capturedConsentValues?.consentVersion).toBe('1.0');
    });
  });

  describe('getUserConsents', () => {
    it('queries userConsents for the given userId', async () => {
      const fakeRows = [
        { id: 'c1', userId: 'user-1', consentType: 'ANALYTICS', given: true },
      ];
      mockSelectWhere.mockResolvedValueOnce(fakeRows);

      const result = await service.getUserConsents('user-1', 'tenant-1');
      expect(result).toEqual(fakeRows);
    });
  });

  // ─── BUG-109 REGRESSION: withTenantContext RLS enforcement ──────────────
  describe('BUG-109 REGRESSION: RLS via withTenantContext', () => {
    it('updateConsent wraps DB ops in withTenantContext', async () => {
      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'AI_PROCESSING',
        given: true,
      });

      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
        }),
        expect.any(Function)
      );
    });

    it('updateConsent passes userRole in tenant context', async () => {
      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'ANALYTICS',
        given: true,
      });

      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userRole: expect.stringMatching(
            /SUPER_ADMIN|ORG_ADMIN|INSTRUCTOR|STUDENT|RESEARCHER/
          ),
        }),
        expect.any(Function)
      );
    });

    it('getUserConsents wraps DB query in withTenantContext', async () => {
      mockSelectWhere.mockResolvedValueOnce([]);

      await service.getUserConsents('user-1', 'tenant-1');

      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });

    it('hasConsent wraps non-ESSENTIAL queries in withTenantContext', async () => {
      await service.hasConsent('user-1', 'tenant-1', 'THIRD_PARTY_LLM');

      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });

    it('hasConsent ESSENTIAL skips withTenantContext (no DB hit)', async () => {
      const result = await service.hasConsent(
        'user-1',
        'tenant-1',
        'ESSENTIAL'
      );
      expect(result).toBe(true);
      expect(withTenantContext).not.toHaveBeenCalled();
    });

    it('withTenantContext is called for both consent upsert and audit log', async () => {
      await service.updateConsent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        consentType: 'MARKETING',
        given: false,
      });

      // Called twice: once for the consent upsert, once for the audit log
      expect(withTenantContext).toHaveBeenCalledTimes(2);
    });
  });
});
