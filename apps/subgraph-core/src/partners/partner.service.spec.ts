/**
 * PartnerService unit tests — Phase 52
 *
 * Verifies:
 *   - requestPartnership returns a partnerId and raw apiKey
 *   - The stored hash differs from the raw key (plaintext never persisted)
 *   - approvePartner sets status to 'active'
 *   - getPartners filters by status
 *   - onModuleDestroy calls closeAllPools (memory-safety gate)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { PartnerService } from './partner.service.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockInsertReturning = vi.fn();
const mockSelectWhere = vi.fn();
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });

const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({ returning: mockInsertReturning }),
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ where: mockSelectWhere }),
  }),
  update: vi.fn().mockReturnValue({ set: mockUpdateSet }),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    partners: {
      id: 'id',
      status: 'status',
      contactEmail: 'contact_email',
      apiKeyHash: 'api_key_hash',
    },
    partnerRevenue: { partnerId: 'partner_id', month: 'month' },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  desc: vi.fn((col: unknown) => ({ col, dir: 'desc' })),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PartnerService', () => {
  let service: PartnerService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnerService],
    }).compile();

    service = module.get<PartnerService>(PartnerService);
  });

  // -------------------------------------------------------------------------
  describe('requestPartnership', () => {
    it('returns a partnerId and a raw apiKey', async () => {
      mockInsertReturning.mockResolvedValue([{ id: 'partner-uuid-1' }]);

      const result = await service.requestPartnership({
        name: 'Acme Training',
        type: 'TRAINING_COMPANY',
        contactEmail: 'partner@acme.com',
        partnerType: 'TRAINING_COMPANY',
      });

      expect(result.partnerId).toBe('partner-uuid-1');
      expect(typeof result.apiKey).toBe('string');
      expect(result.apiKey.length).toBeGreaterThan(0);
    });

    it('stores SHA-256 hash — NOT the plaintext API key', async () => {
      let capturedValues: Record<string, unknown> | undefined;
      const mockValuesCapture = vi.fn((v: Record<string, unknown>) => {
        capturedValues = v;
        return { returning: vi.fn().mockResolvedValue([{ id: 'partner-uuid-2' }]) };
      });
      mockDb.insert.mockReturnValueOnce({ values: mockValuesCapture });

      const result = await service.requestPartnership({
        name: 'Beta Corp',
        type: 'RESELLER',
        contactEmail: 'beta@corp.com',
        partnerType: 'RESELLER',
      });

      const expectedHash = createHash('sha256').update(result.apiKey).digest('hex');
      expect(capturedValues?.['apiKeyHash']).toBe(expectedHash);
      expect(capturedValues?.['apiKeyHash']).not.toBe(result.apiKey);
    });

    it('throws if DB insert returns no rows', async () => {
      mockInsertReturning.mockResolvedValue([]);
      await expect(
        service.requestPartnership({
          name: 'Fail Corp',
          type: 'RESELLER',
          contactEmail: 'fail@corp.com',
          partnerType: 'RESELLER',
        })
      ).rejects.toThrow('Failed to create partner application');
    });
  });

  // -------------------------------------------------------------------------
  describe('getPartners', () => {
    it('returns all partners when status not provided', async () => {
      const mockRows = [{ id: 'p1', status: 'active' }];
      const mockFrom = vi.fn().mockResolvedValue(mockRows);
      mockDb.select.mockReturnValueOnce({ from: mockFrom });

      const result = await service.getPartners();
      expect(result).toEqual(mockRows);
    });

    it('filters by status when provided', async () => {
      const mockRows = [{ id: 'p2', status: 'pending' }];
      mockSelectWhere.mockResolvedValue(mockRows);

      const result = await service.getPartners('pending');
      expect(result).toEqual(mockRows);
    });
  });

  // -------------------------------------------------------------------------
  describe('approvePartner', () => {
    it('calls update with status active', async () => {
      mockUpdateWhere.mockResolvedValue([]);
      await service.approvePartner('partner-uuid-3', 'Looks good');

      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', notes: 'Looks good' })
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('onModuleDestroy', () => {
    it('calls closeAllPools to release DB connections', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalledTimes(1);
    });
  });
});
