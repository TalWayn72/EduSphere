import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service.js';

// Mock @edusphere/db to avoid real DB connection in unit tests
vi.mock('@edusphere/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('@edusphere/db/schema', () => ({
  auditLog: {},
}));

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
    vi.clearAllMocks();
  });

  it('logs a successful entry without throwing', async () => {
    await expect(
      service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'CREATE',
        resourceType: 'ANNOTATION',
        status: 'SUCCESS',
      }),
    ).resolves.not.toThrow();
  });

  it('does not throw when DB write fails (fire-and-forget)', async () => {
    const { db } = await import('@edusphere/db');
    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    } as ReturnType<typeof db.insert>);

    await expect(
      service.log({
        tenantId: 'tenant-1',
        action: 'DELETE',
      }),
    ).resolves.not.toThrow();
  });

  it('logs with all optional fields', async () => {
    await expect(
      service.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'DATA_ERASURE',
        resourceType: 'USER',
        resourceId: 'user-to-erase',
        oldValues: { email: '[REDACTED]' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
        status: 'SUCCESS',
        metadata: { gdprArticle: '17' },
      }),
    ).resolves.not.toThrow();
  });
});
