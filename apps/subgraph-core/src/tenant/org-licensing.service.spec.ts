/**
 * org-licensing.service.spec.ts — Unit tests for OrgLicensingService.
 * Covers: licenseCourse, revokeLicense, listLicenses, onModuleDestroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();
const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
    fn({ execute: mockExecute })
  ),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

import { OrgLicensingService } from './org-licensing.service';

const ctx = { tenantId: 't1', userId: 'admin1', userRole: 'ORG_ADMIN' as const };

describe('OrgLicensingService', () => {
  let service: OrgLicensingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrgLicensingService();
  });

  describe('licenseCourse', () => {
    it('should create an UNLIMITED license', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] }) // no existing
        .mockResolvedValueOnce({
          rows: [{
            id: 'lic1', course_id: 'c1', license_type: 'UNLIMITED',
            max_seats: null, used_seats: 0, status: 'ACTIVE',
            licensed_at: new Date(), expires_at: null,
          }],
        });

      const result = await service.licenseCourse(
        { courseId: 'c1', licenseType: 'UNLIMITED' }, ctx
      );
      expect(result.id).toBe('lic1');
      expect(result.status).toBe('ACTIVE');
      expect(result.maxSeats).toBeNull();
    });

    it('should throw when PER_SEAT without maxSeats', async () => {
      await expect(
        service.licenseCourse({ courseId: 'c1', licenseType: 'PER_SEAT' }, ctx)
      ).rejects.toThrow('maxSeats required for PER_SEAT license');
    });

    it('should throw when active license already exists', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      await expect(
        service.licenseCourse({ courseId: 'c1', licenseType: 'UNLIMITED' }, ctx)
      ).rejects.toThrow('Active license already exists');
    });

    it('should set expiresAt for TIME_LIMITED with durationMonths', async () => {
      mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'lic2', course_id: 'c2', license_type: 'TIME_LIMITED',
            max_seats: null, used_seats: 0, status: 'ACTIVE',
            licensed_at: new Date(), expires_at: new Date('2026-06-01'),
          }],
        });

      const result = await service.licenseCourse(
        { courseId: 'c2', licenseType: 'TIME_LIMITED', durationMonths: 3 }, ctx
      );
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('revokeLicense', () => {
    it('should revoke and return true', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await service.revokeLicense('lic1', ctx);
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('listLicenses', () => {
    it('should return mapped license array', async () => {
      mockExecute.mockResolvedValue({
        rows: [
          {
            id: 'lic1', course_id: 'c1', license_type: 'UNLIMITED',
            max_seats: null, used_seats: 0, status: 'ACTIVE',
            licensed_at: new Date(), expires_at: null,
          },
        ],
      });
      const result = await service.listLicenses(ctx);
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe('c1');
    });

    it('should return empty array when no licenses', async () => {
      mockExecute.mockResolvedValue({ rows: [] });
      const result = await service.listLicenses(ctx);
      expect(result).toEqual([]);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close pools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalled();
    });
  });
});
