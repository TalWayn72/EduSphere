/**
 * tenant-social-links.service.spec.ts — Unit tests for TenantSocialLinksService.
 * Tests get (found/not-found) and upsert (insert + onConflict update).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantSocialLinksService } from './tenant-social-links.service.js';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(),
  schema: {
    tenantSocialLinks: {
      tenantId: 'tenantId',
      $inferSelect: {},
    },
  },
  eq: vi.fn((...args: unknown[]) => args),
}));

import { withTenantContext, closeAllPools } from '@edusphere/db';

const mockWithTenantContext = vi.mocked(withTenantContext);
const mockCloseAllPools = vi.mocked(closeAllPools);

const TENANT_ID = 't-100';
const USER_ID = 'u-100';

const FULL_ROW = {
  id: 'sl-1',
  tenantId: TENANT_ID,
  linkedinUrl: 'https://linkedin.com/test',
  facebookUrl: 'https://facebook.com/test',
  twitterUrl: null,
  youtubeUrl: null,
  instagramUrl: 'https://instagram.com/test',
  whatsappUrl: null,
  githubUrl: 'https://github.com/test',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TenantSocialLinksService', () => {
  let service: TenantSocialLinksService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantSocialLinksService();
  });

  describe('get', () => {
    it('returns mapped SocialLinksDto when row exists', async () => {
      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([FULL_ROW]),
        };
        return fn(mockTx as never);
      });

      const result = await service.get(TENANT_ID, USER_ID);
      expect(result).toEqual({
        id: 'sl-1',
        linkedinUrl: 'https://linkedin.com/test',
        facebookUrl: 'https://facebook.com/test',
        twitterUrl: null,
        youtubeUrl: null,
        instagramUrl: 'https://instagram.com/test',
        whatsappUrl: null,
        githubUrl: 'https://github.com/test',
      });
    });

    it('returns null when no social links exist', async () => {
      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };
        return fn(mockTx as never);
      });

      const result = await service.get(TENANT_ID, USER_ID);
      expect(result).toBeNull();
    });

    it('passes STUDENT role in tenant context', async () => {
      let capturedCtx: Record<string, unknown> | null = null;
      mockWithTenantContext.mockImplementation(async (_db, ctx, fn) => {
        capturedCtx = ctx as Record<string, unknown>;
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };
        return fn(mockTx as never);
      });

      await service.get(TENANT_ID, USER_ID);
      expect(capturedCtx).toMatchObject({ tenantId: TENANT_ID, userId: USER_ID, userRole: 'STUDENT' });
    });
  });

  describe('upsert', () => {
    it('returns mapped dto after upsert', async () => {
      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([FULL_ROW]),
        };
        return fn(mockTx as never);
      });

      const result = await service.upsert(TENANT_ID, USER_ID, {
        linkedinUrl: 'https://linkedin.com/test',
      });

      expect(result.id).toBe('sl-1');
      expect(result.linkedinUrl).toBe('https://linkedin.com/test');
    });

    it('uses ORG_ADMIN role for upsert context', async () => {
      let capturedCtx: Record<string, unknown> | null = null;
      mockWithTenantContext.mockImplementation(async (_db, ctx, fn) => {
        capturedCtx = ctx as Record<string, unknown>;
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([FULL_ROW]),
        };
        return fn(mockTx as never);
      });

      await service.upsert(TENANT_ID, USER_ID, { githubUrl: 'https://github.com/x' });
      expect(capturedCtx).toMatchObject({ userRole: 'ORG_ADMIN' });
    });

    it('sets null for omitted fields', async () => {
      let capturedValues: Record<string, unknown> | null = null;
      mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn((v: Record<string, unknown>) => {
            capturedValues = v;
            return { onConflictDoUpdate: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([FULL_ROW]) };
          }),
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([FULL_ROW]),
        };
        return fn(mockTx as never);
      });

      await service.upsert(TENANT_ID, USER_ID, { linkedinUrl: 'https://linked.in' });
      expect(capturedValues).toBeDefined();
      expect((capturedValues as Record<string, unknown>)['facebookUrl']).toBeNull();
      expect((capturedValues as Record<string, unknown>)['twitterUrl']).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledOnce();
    });
  });
});
