import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantService } from './tenant.service';

const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();

const mockDb = {
  select: vi.fn(() => ({ from: mockFrom })),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    tenants: { id: 'id', name: 'name' },
    users: { id: 'id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
}));

const MOCK_TENANT = {
  id: 'tenant-1',
  name: 'Test Org',
  plan: 'PROFESSIONAL',
};

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([MOCK_TENANT]);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockOffset.mockResolvedValue([MOCK_TENANT]);
    mockFrom.mockReturnValue({
      where: mockWhere,
      limit: vi.fn().mockReturnValue({ offset: mockOffset }),
    });

    service = new TenantService();
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns tenant when found', async () => {
      const result = await service.findById('tenant-1');
      expect(result).toEqual(MOCK_TENANT);
    });

    it('returns null when tenant not found', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('queries by ID using eq operator', async () => {
      const { eq } = await import('@edusphere/db');
      await service.findById('tenant-1');
      expect(eq).toHaveBeenCalledWith(
        expect.anything(),
        'tenant-1'
      );
    });

    it('applies limit 1', async () => {
      await service.findById('tenant-1');
      expect(mockWhere).toHaveBeenCalled();
      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns array of tenants', async () => {
      const result = await service.findAll(10, 0);
      expect(result).toBeDefined();
    });

    it('applies limit parameter', async () => {
      const mockLimitFn = vi.fn().mockReturnValue({ offset: mockOffset });
      mockFrom.mockReturnValue({ where: mockWhere, limit: mockLimitFn });
      service = new TenantService();
      await service.findAll(25, 0);
      expect(mockLimitFn).toHaveBeenCalledWith(25);
    });

    it('applies offset parameter', async () => {
      await service.findAll(10, 50);
      expect(mockOffset).toHaveBeenCalledWith(50);
    });

    it('applies limit 0 correctly', async () => {
      const mockLimitFn = vi.fn().mockReturnValue({ offset: mockOffset });
      mockFrom.mockReturnValue({ where: mockWhere, limit: mockLimitFn });
      service = new TenantService();
      await service.findAll(0, 0);
      expect(mockLimitFn).toHaveBeenCalledWith(0);
    });
  });
});
