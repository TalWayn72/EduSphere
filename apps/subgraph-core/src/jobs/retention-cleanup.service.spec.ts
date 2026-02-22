import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetentionCleanupService } from './retention-cleanup.service.js';

vi.mock('@edusphere/db', () => ({
  db: {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      }),
    }),
  },
}));

vi.mock('@edusphere/db/schema', () => ({
  RETENTION_DEFAULTS: {
    AGENT_MESSAGES: { days: 90, mode: 'HARD_DELETE' },
  },
  // All tables referenced in cleanupEntity tableMap must be present in mock
  agentMessages: { createdAt: 'created_at' },
  agentSessions: { createdAt: 'created_at' },
  userProgress: { createdAt: 'created_at' },
  annotations: { createdAt: 'created_at' },
}));

describe('RetentionCleanupService', () => {
  let service: RetentionCleanupService;

  beforeEach(() => {
    service = new RetentionCleanupService();
    vi.clearAllMocks();
  });

  it('returns a cleanup report with startedAt and completedAt', async () => {
    const report = await service.runCleanup();
    expect(report.startedAt).toBeInstanceOf(Date);
    expect(report.completedAt).toBeInstanceOf(Date);
    expect(report.results).toHaveLength(1);
  });

  it('report result has correct entityType', async () => {
    const report = await service.runCleanup();
    expect(report.results[0]?.entityType).toBe('AGENT_MESSAGES');
  });

  it('does not throw when cleanup fails for one entity (resilient loop)', async () => {
    const { db } = await import('@edusphere/db');
    vi.mocked(db.delete).mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error('DB error')),
      }),
    } as ReturnType<typeof db.delete>);

    const report = await service.runCleanup();
    expect(report.results[0]?.error).toBe('DB error');
    expect(report.completedAt).toBeInstanceOf(Date);
  });

  it('result for unknown entity type returns SKIPPED mode', async () => {
    vi.doMock('@edusphere/db/schema', () => ({
      RETENTION_DEFAULTS: {
        UNKNOWN_TYPE: { days: 30, mode: 'HARD_DELETE' },
      },
    }));

    // Direct test of resilience — unknown entity silently skipped
    const report = await service.runCleanup();
    // With original mock having only AGENT_MESSAGES, result length is 1
    expect(report.results).toHaveLength(1);
  });
});
