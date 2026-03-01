import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { CpdResolver } from './cpd.resolver.js';

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

const mockCpdService = {
  getUserCpdReport: vi.fn(),
  listCreditTypes: vi.fn(),
  exportCpdReport: vi.fn(),
  createCreditType: vi.fn(),
  assignCreditsToCourse: vi.fn(),
};

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-123';
const USER_ID = 'user-456';

const AUTH_CTX = { tenantId: TENANT_ID, userId: USER_ID };
/** Pass `null` to simulate missing authContext */
const makeCtx = (auth: typeof AUTH_CTX | null = AUTH_CTX) => ({
  authContext: auth ?? undefined,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CpdResolver', () => {
  let resolver: CpdResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new CpdResolver(mockCpdService as never);
  });

  // ── myCpdReport — auth ────────────────────────────────────────────────────

  it('myCpdReport — throws UnauthorizedException when authContext absent', async () => {
    await expect(
      resolver.myCpdReport(undefined, undefined, makeCtx(null))
    ).rejects.toThrow(UnauthorizedException);
  });

  it('myCpdReport — throws UnauthorizedException when userId missing', async () => {
    const ctx = { authContext: { tenantId: TENANT_ID, userId: '' } };
    await expect(
      resolver.myCpdReport(undefined, undefined, ctx as never)
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── myCpdReport — delegation ──────────────────────────────────────────────

  it('myCpdReport — calls service without dateRange when dates absent', async () => {
    const mockReport = { totalHours: 10, byType: [], entries: [] };
    mockCpdService.getUserCpdReport.mockResolvedValue(mockReport);

    const result = await resolver.myCpdReport(
      undefined,
      undefined,
      makeCtx()
    );

    expect(mockCpdService.getUserCpdReport).toHaveBeenCalledWith(
      USER_ID,
      TENANT_ID,
      undefined
    );
    expect(result).toBe(mockReport);
  });

  it('myCpdReport — calls service with parsed dateRange when both dates provided', async () => {
    mockCpdService.getUserCpdReport.mockResolvedValue({});

    await resolver.myCpdReport('2026-01-01', '2026-01-31', makeCtx());

    const [, , dateRange] =
      mockCpdService.getUserCpdReport.mock.calls[0] as [
        string,
        string,
        { start: Date; end: Date } | undefined,
      ];
    expect(dateRange?.start).toBeInstanceOf(Date);
    expect(dateRange?.end).toBeInstanceOf(Date);
    expect(dateRange?.start?.getFullYear()).toBe(2026);
  });

  // ── cpdCreditTypes ────────────────────────────────────────────────────────

  it('cpdCreditTypes — throws UnauthorizedException when tenantId missing', async () => {
    const ctx = { authContext: { tenantId: '', userId: USER_ID } };
    await expect(resolver.cpdCreditTypes(ctx as never)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('cpdCreditTypes — delegates to service with tenantId', async () => {
    const types = [{ id: 'ct1', name: 'CPE', regulatoryBody: 'NASBA' }];
    mockCpdService.listCreditTypes.mockResolvedValue(types);

    const result = await resolver.cpdCreditTypes(makeCtx());

    expect(mockCpdService.listCreditTypes).toHaveBeenCalledWith(TENANT_ID);
    expect(result).toBe(types);
  });

  // ── exportCpdReport ───────────────────────────────────────────────────────

  it('exportCpdReport — returns signed URL from service', async () => {
    mockCpdService.exportCpdReport.mockResolvedValue(
      'https://minio/report.csv'
    );

    const url = await resolver.exportCpdReport('CSV', makeCtx());

    expect(mockCpdService.exportCpdReport).toHaveBeenCalledWith(
      USER_ID,
      TENANT_ID,
      'CSV'
    );
    expect(url).toBe('https://minio/report.csv');
  });

  // ── createCpdCreditType ───────────────────────────────────────────────────

  it('createCpdCreditType — builds CreateCreditTypeInput and delegates to service', async () => {
    const created = {
      id: 'ct-new',
      name: 'CME',
      regulatoryBody: 'AMA',
      creditHoursPerHour: 1,
    };
    mockCpdService.createCreditType.mockResolvedValue(created);

    const result = await resolver.createCpdCreditType(
      'CME',
      'AMA',
      1,
      makeCtx()
    );

    expect(mockCpdService.createCreditType).toHaveBeenCalledWith(
      { name: 'CME', regulatoryBody: 'AMA', creditHoursPerHour: 1 },
      TENANT_ID
    );
    expect(result).toBe(created);
  });

  // ── assignCpdCreditsToCourse ──────────────────────────────────────────────

  it('assignCpdCreditsToCourse — delegates to service and returns true', async () => {
    mockCpdService.assignCreditsToCourse.mockResolvedValue(undefined);

    const result = await resolver.assignCpdCreditsToCourse(
      'course-1',
      'ct-1',
      2,
      makeCtx()
    );

    expect(mockCpdService.assignCreditsToCourse).toHaveBeenCalledWith(
      'course-1',
      'ct-1',
      2,
      TENANT_ID
    );
    expect(result).toBe(true);
  });

  it('assignCpdCreditsToCourse — throws UnauthorizedException when tenantId missing', async () => {
    const ctx = { authContext: { tenantId: '', userId: USER_ID } };
    await expect(
      resolver.assignCpdCreditsToCourse('c1', 'ct1', 1, ctx as never)
    ).rejects.toThrow(UnauthorizedException);
  });
});
