/**
 * cpd.service.spec.ts - Unit tests for F-027 CpdService
 *
 * Tests:
 *  1. NATS consumer processes course.completed and creates CPD log entry
 *  2. getUserCpdReport aggregates hours by credit type
 *  3. getUserCpdReport filters by date range
 *  4. getUserCpdReport returns empty when no credits assigned
 *  5. exportCpdReport calls csv-generator for CSV format
 *  6. exportCpdReport calls PDFKit service for NASBA format
 *  7. assignCreditsToCourse creates course_cpd_credits record
 *  8. listCreditTypes returns only active types
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockCloseAllPools,
  mockWithTenantContext,
  mockNatsConnect,
  mockInsert,
  mockSelect,
} = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockWithTenantContext = vi.fn();
  const asyncIter = { next: vi.fn().mockResolvedValue({ done: true }) };
  const mockSub = {
    unsubscribe: vi.fn(),
    [Symbol.asyncIterator]: vi.fn().mockReturnValue(asyncIter),
  };
  const mockNatsConnect = vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue(mockSub),
    drain: vi.fn().mockResolvedValue(undefined),
  });
  return {
    mockCloseAllPools,
    mockWithTenantContext,
    mockNatsConnect,
    mockInsert,
    mockSelect,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({
    select: mockSelect,
    insert: mockInsert,
  }),
  closeAllPools: mockCloseAllPools,
  schema: {
    courseCpdCredits: {
      courseId: 'courseId',
      tenantId: 'tenantId',
      creditTypeId: 'creditTypeId',
      creditHours: 'creditHours',
    },
    userCpdLog: {
      userId: 'userId',
      tenantId: 'tenantId',
      creditTypeId: 'creditTypeId',
      completionDate: 'completionDate',
    },
    cpdCreditTypes: {
      id: 'id',
      tenantId: 'tenantId',
      name: 'name',
      regulatoryBody: 'regulatoryBody',
      isActive: 'isActive',
    },
  },
  eq: vi.fn((_a, _b) => 'eq'),
  and: vi.fn((...args) => args),
  gte: vi.fn((_a, _b) => 'gte'),
  lte: vi.fn((_a, _b) => 'lte'),
  withTenantContext: mockWithTenantContext,
}));

vi.mock('nats', () => ({
  connect: mockNatsConnect,
  StringCodec: vi.fn().mockReturnValue({
    decode: vi.fn().mockReturnValue('{}'),
    encode: vi.fn(),
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi
    .fn()
    .mockReturnValue({ servers: 'nats://localhost:4222' }),
  isCourseCompletedEvent: vi.fn(),
}));

const mockGenerateReport = vi
  .fn()
  .mockResolvedValue('https://presigned-url/report.csv');
vi.mock('./cpd-export.service.js', () => ({
  CpdExportService: vi.fn().mockImplementation(function CpdExportServiceCtor() {
    return { generateReport: mockGenerateReport };
  }),
}));

import { CpdService } from './cpd.service.js';
import { CpdExportService } from './cpd-export.service.js';
import { isCourseCompletedEvent } from '@edusphere/nats-client';

function makeService() {
  const exportSvc = new CpdExportService();
  return new CpdService(exportSvc);
}

const sampleLogRows = [
  {
    id: 'log-1',
    courseId: 'course-1',
    earnedHours: '2.50',
    completionDate: new Date('2025-01-15'),
    creditTypeName: 'NASBA CPE',
    regulatoryBody: 'NASBA',
  },
  {
    id: 'log-2',
    courseId: 'course-2',
    earnedHours: '1.00',
    completionDate: new Date('2025-02-10'),
    creditTypeName: 'NASBA CPE',
    regulatoryBody: 'NASBA',
  },
];

describe('CpdService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test 1: NATS consumer processes course.completed and creates CPD log entry', async () => {
    vi.mocked(isCourseCompletedEvent).mockReturnValue(true);
    const credits = [{ creditTypeId: 'ct-1', creditHours: '2.00' }];
    mockWithTenantContext
      .mockImplementationOnce(
        async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
          fn({
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(credits),
              }),
            }),
          })
      )
      .mockImplementationOnce(
        async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
          fn({
            insert: vi
              .fn()
              .mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
          })
      );

    const svc = makeService();
    const payload = {
      courseId: 'c-1',
      userId: 'u-1',
      tenantId: 't-1',
      completionDate: new Date().toISOString(),
    };

    // Access private method via type assertion for testing
    await (
      svc as unknown as {
        handleCourseCompleted: (p: typeof payload) => Promise<void>;
      }
    ).handleCourseCompleted(payload);

    expect(mockWithTenantContext).toHaveBeenCalledTimes(2);
  });

  it('test 2: getUserCpdReport aggregates hours by credit type', async () => {
    mockWithTenantContext.mockImplementationOnce(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(sampleLogRows),
              }),
            }),
          }),
        })
    );

    const svc = makeService();
    const report = await svc.getUserCpdReport('user-1', 'tenant-1');

    expect(report.totalHours).toBeCloseTo(3.5);
    expect(report.byType).toHaveLength(1);
    expect(report.byType[0]?.name).toBe('NASBA CPE');
    expect(report.byType[0]?.totalHours).toBeCloseTo(3.5);
  });

  it('test 3: getUserCpdReport filters by date range', async () => {
    const filteredRows = [sampleLogRows[0]!];
    mockWithTenantContext.mockImplementationOnce(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(filteredRows),
              }),
            }),
          }),
        })
    );

    const svc = makeService();
    const report = await svc.getUserCpdReport('user-1', 'tenant-1', {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31'),
    });

    expect(report.entries).toHaveLength(1);
    expect(report.totalHours).toBeCloseTo(2.5);
  });

  it('test 4: getUserCpdReport returns empty when no credits assigned', async () => {
    mockWithTenantContext.mockImplementationOnce(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi
                .fn()
                .mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
            }),
          }),
        })
    );

    const svc = makeService();
    const report = await svc.getUserCpdReport('user-1', 'tenant-1');

    expect(report.totalHours).toBe(0);
    expect(report.byType).toHaveLength(0);
    expect(report.entries).toHaveLength(0);
  });

  it('test 5: exportCpdReport calls generateReport for CSV format', async () => {
    mockWithTenantContext.mockImplementationOnce(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi
                .fn()
                .mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
            }),
          }),
        })
    );

    const svc = makeService();
    const url = await svc.exportCpdReport('user-1', 'tenant-1', 'CSV');

    expect(mockGenerateReport).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      'tenant-1',
      'CSV'
    );
    expect(url).toBe('https://presigned-url/report.csv');
  });

  it('test 6: exportCpdReport calls generateReport for NASBA format', async () => {
    mockWithTenantContext.mockImplementationOnce(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(sampleLogRows),
              }),
            }),
          }),
        })
    );

    const svc = makeService();
    const url = await svc.exportCpdReport('user-1', 'tenant-1', 'NASBA');

    expect(mockGenerateReport).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      'tenant-1',
      'NASBA'
    );
    expect(url).toBe('https://presigned-url/report.csv');
  });

  it('test 7: assignCreditsToCourse inserts course_cpd_credits record', async () => {
    const mockInsertValues = vi.fn().mockResolvedValue([]);
    mockWithTenantContext.mockImplementationOnce(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
        fn({ insert: vi.fn().mockReturnValue({ values: mockInsertValues }) })
    );

    const svc = makeService();
    await svc.assignCreditsToCourse('course-1', 'ct-1', 3.0, 'tenant-1');

    expect(mockWithTenantContext).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'course-1',
        creditTypeId: 'ct-1',
        creditHours: '3.00',
        tenantId: 'tenant-1',
      })
    );
  });

  it('test 8: listCreditTypes returns only active types', async () => {
    const activeCreditTypes = [
      {
        id: 'ct-1',
        name: 'NASBA CPE',
        regulatoryBody: 'NASBA',
        creditHoursPerHour: '1.00',
        isActive: true,
      },
    ];
    mockWithTenantContext.mockImplementationOnce(
      async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(activeCreditTypes),
            }),
          }),
        })
    );

    const svc = makeService();
    const result = await svc.listCreditTypes('tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.isActive).toBe(true);
  });
});
