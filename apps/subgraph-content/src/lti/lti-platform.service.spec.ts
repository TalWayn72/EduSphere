import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LtiPlatformService } from './lti-platform.service';

const mockTx = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    ltiPlatforms: {
      id: 'id',
      tenant_id: 'tenant_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

const validInput = {
  platformName: 'Canvas LMS',
  platformUrl: 'https://canvas.example.com',
  clientId: 'client-123',
  authLoginUrl: 'https://canvas.example.com/auth/login',
  authTokenUrl: 'https://canvas.example.com/auth/token',
  keySetUrl: 'https://canvas.example.com/.well-known/jwks',
  deploymentId: 'deploy-1',
};

const dbRow = {
  id: 'plat-1',
  tenant_id: 't1',
  platform_name: 'Canvas LMS',
  platform_url: 'https://canvas.example.com',
  client_id: 'client-123',
  auth_login_url: 'https://canvas.example.com/auth/login',
  auth_token_url: 'https://canvas.example.com/auth/token',
  key_set_url: 'https://canvas.example.com/.well-known/jwks',
  deployment_id: 'deploy-1',
  is_active: true,
};

function makeSelectChain(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

function makeInsertChain(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

function makeUpdateChain(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

describe('LtiPlatformService', () => {
  let service: LtiPlatformService;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['LTI_PLATFORM_ISSUER'];
    service = new LtiPlatformService();
  });

  describe('onModuleDestroy()', () => {
    it('closes DB pools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  describe('getPlatforms()', () => {
    it('returns DB platforms when they exist', async () => {
      const chain = makeSelectChain([dbRow]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getPlatforms('t1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'plat-1',
        platformName: 'Canvas LMS',
        clientId: 'client-123',
        isActive: true,
      });
    });

    it('falls back to env config when no DB records', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });
      process.env['LTI_PLATFORM_ISSUER'] = 'https://lms.example.com';
      process.env['LTI_PLATFORM_CLIENT_ID'] = 'env-client';

      const result = await service.getPlatforms('t1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        platformUrl: 'https://lms.example.com',
        clientId: 'env-client',
        isActive: true,
      });
    });

    it('returns empty array when no DB records and no env config', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getPlatforms('t1');
      expect(result).toEqual([]);
    });
  });

  describe('registerPlatform()', () => {
    it('inserts and returns platform DTO', async () => {
      const chain = makeInsertChain([dbRow]);
      mockTx.insert.mockReturnValueOnce({ values: chain.values });

      const result = await service.registerPlatform('t1', validInput);

      expect(result).toMatchObject({
        id: 'plat-1',
        platformName: 'Canvas LMS',
        tenantId: 't1',
      });
    });

    it('throws BadRequestException for invalid URL', async () => {
      await expect(
        service.registerPlatform('t1', {
          ...validInput,
          platformUrl: 'not-a-url',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for empty platformName', async () => {
      await expect(
        service.registerPlatform('t1', {
          ...validInput,
          platformName: '',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when insert returns no row', async () => {
      const chain = makeInsertChain([]);
      mockTx.insert.mockReturnValueOnce({ values: chain.values });

      await expect(service.registerPlatform('t1', validInput)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('togglePlatform()', () => {
    it('toggles platform active state and returns DTO', async () => {
      const chain = makeUpdateChain([{ ...dbRow, is_active: false }]);
      mockTx.update.mockReturnValueOnce({ set: chain.set });

      const result = await service.togglePlatform('plat-1', 't1', false);

      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException when platform not found', async () => {
      const chain = makeUpdateChain([]);
      mockTx.update.mockReturnValueOnce({ set: chain.set });

      await expect(
        service.togglePlatform('missing', 't1', true)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
