/**
 * audit-log.service.spec.ts — Unit tests for AuditLogService.
 * Covers: CSV generation, DB delegation, S3 presigned URL, onModuleDestroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockS3Send, mockS3Destroy } = vi.hoisted(() => ({
  mockS3Send: vi.fn().mockResolvedValue({}),
  mockS3Destroy: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  auditLog: {
    tenantId: {}, userId: {}, action: {}, createdAt: {},
    resourceType: {}, resourceId: {}, status: {}, ipAddress: {},
    requestId: {}, metadata: {}, userAgent: {},
  },
  count: vi.fn(() => 'COUNT(*)'),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn(),
  like: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  // S3Client must be a constructor function (not an arrow fn)
  S3Client: function S3Client() {
    return { send: mockS3Send, destroy: mockS3Destroy };
  },
  PutObjectCommand: function PutObjectCommand(args: unknown) {
    return { _type: 'PutObject', ...(args as object) };
  },
  GetObjectCommand: function GetObjectCommand(args: unknown) {
    return { _type: 'GetObject', ...(args as object) };
  },
  DeleteObjectsCommand: function DeleteObjectsCommand(args: unknown) {
    return { _type: 'DeleteObjects', ...(args as object) };
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio/audit-export.csv'),
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: {
    endpoint: 'http://localhost',
    port: 9000,
    useSSL: false,
    bucket: 'test-bucket',
    region: 'us-east-1',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { AuditLogService } from './audit-log.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

type AuditEntry = {
  id: string; tenantId: string; userId: string | null; action: string;
  resourceType: string | null; resourceId: string | null; status: string;
  ipAddress: string | null; requestId: string | null; createdAt: string;
  metadata: string | null;
};

const makeEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 'entry-1', tenantId: 'tenant-1', userId: 'user-1', action: 'USER_LOGIN',
  resourceType: null, resourceId: null, status: 'SUCCESS',
  ipAddress: '127.0.0.1', requestId: 'req-1',
  createdAt: new Date('2026-01-01T00:00:00Z').toISOString(), metadata: null,
  ...overrides,
});

/**
 * Build a thenable chain for db.select().from().where().orderBy().limit().offset()
 * that resolves to `rows`. Each call index picks from rowsBatches.
 */
function buildSelectMock(rowsBatches: unknown[][]) {
  let callIndex = 0;
  return () => {
    const rows = rowsBatches[callIndex++] ?? [];
    const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, () => unknown>;
    const self = (): typeof p => p;
    p.from = self; p.where = self; p.orderBy = self; p.limit = self; p.offset = self;
    return p;
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockS3Send.mockResolvedValue({});
    service = new AuditLogService();
  });

  // 1. service instantiates without error
  it('instantiates without throwing', () => {
    expect(() => new AuditLogService()).not.toThrow();
  });

  // 2. onModuleDestroy calls s3.destroy
  it('onModuleDestroy calls s3.destroy()', () => {
    service.onModuleDestroy();
    expect(mockS3Destroy).toHaveBeenCalled();
  });

  // 3. entriesToCsv wraps comma-containing values in double quotes
  it('entriesToCsv wraps values containing commas in double quotes', () => {
    const svc = service as unknown as {
      entriesToCsv: (entries: AuditEntry[]) => string;
    };
    const csv = svc.entriesToCsv([makeEntry({ action: 'LOGIN,LOGOUT' })]);
    expect(csv).toContain('"LOGIN,LOGOUT"');
  });

  // 4. entriesToCsv escapes internal double quotes
  it('entriesToCsv escapes embedded double quotes by doubling them', () => {
    const svc = service as unknown as {
      entriesToCsv: (entries: AuditEntry[]) => string;
    };
    const csv = svc.entriesToCsv([makeEntry({ action: 'He said "hello"' })]);
    expect(csv).toContain('""hello""');
  });

  // 5. getAuditLog returns entries array and total count
  it('getAuditLog returns entries and total from DB', async () => {
    const { db } = await import('@edusphere/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    const dbRow = {
      id: 'e1', tenantId: 't1', userId: 'u1', action: 'LOGIN',
      resourceType: null, resourceId: null, status: 'SUCCESS',
      ipAddress: null, requestId: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      metadata: null, userAgent: null,
    };
    mockSelect.mockImplementation(buildSelectMock([[dbRow], [{ total: 1 }]]));
    const result = await service.getAuditLog('tenant-1', { limit: 10, offset: 0 });
    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.entries[0]?.action).toBe('LOGIN');
  });

  // 6. getAuditLog maps createdAt Date to ISO string
  it('getAuditLog maps createdAt Date to ISO string', async () => {
    const { db } = await import('@edusphere/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    const date = new Date('2026-03-01T12:00:00Z');
    const dbRow = {
      id: 'e1', tenantId: 't1', userId: null, action: 'EXPORT',
      resourceType: null, resourceId: null, status: 'SUCCESS',
      ipAddress: null, requestId: null, createdAt: date, metadata: null, userAgent: null,
    };
    mockSelect.mockImplementation(buildSelectMock([[dbRow], [{ total: 1 }]]));
    const result = await service.getAuditLog('tenant-1', { limit: 10, offset: 0 });
    expect(result.entries[0]?.createdAt).toBe(date.toISOString());
  });

  // 7. exportAuditLog returns presignedUrl
  it('exportAuditLog returns presignedUrl from getSignedUrl', async () => {
    const { db } = await import('@edusphere/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    const dbRow = {
      id: 'e1', tenantId: 't1', userId: 'u1', action: 'LOGIN',
      resourceType: null, resourceId: null, status: 'SUCCESS',
      ipAddress: null, requestId: null, createdAt: new Date(), metadata: null, userAgent: null,
    };
    // exportAuditLog calls getAuditLog internally → 2 selects (rows + count)
    mockSelect.mockImplementation(buildSelectMock([[dbRow], [{ total: 1 }]]));
    const result = await service.exportAuditLog('tenant-1', '2026-01-01', '2026-01-31', 'CSV');
    expect(result.presignedUrl).toBe('https://minio/audit-export.csv');
    expect(result.recordCount).toBe(1);
  });

  // 8. exportAuditLog returns expiresAt in the future
  it('exportAuditLog returns expiresAt ISO string in the future', async () => {
    const { db } = await import('@edusphere/db');
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockImplementation(buildSelectMock([[], [{ total: 0 }]]));
    const result = await service.exportAuditLog('tenant-1', '2026-01-01', '2026-01-31', 'JSON');
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
