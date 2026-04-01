import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamSecurityService } from './exam-security.service';

const mockTx = {
  execute: vi.fn().mockResolvedValue(undefined),
  update: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    examSessions: { id: 'id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
  sql: vi.fn((...args: unknown[]) => args),
}));

const sessionHelpersMock = { loadSession: vi.fn() };

vi.mock('./exam-session-helpers.js', () => ({
  ExamSessionHelpers: class {
    loadSession = sessionHelpersMock.loadSession;
  },
}));

function makeUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  return { set, where };
}

describe('ExamSecurityService', () => {
  let service: ExamSecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExamSecurityService();
  });

  describe('onModuleDestroy()', () => {
    it('closes DB pools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  describe('recordBrowserEvent()', () => {
    it('executes SQL update for browser event', async () => {
      await service.recordBrowserEvent(
        'session-1',
        { type: 'TAB_SWITCH', timestamp: '2025-01-01T00:00:00Z' },
        'tenant-1'
      );

      expect(mockTx.execute).toHaveBeenCalled();
    });
  });

  describe('evaluateViolations()', () => {
    it('returns zero risk for no events', async () => {
      sessionHelpersMock.loadSession.mockResolvedValueOnce({
        browserEvents: [],
      });

      const result = await service.evaluateViolations('s1', 't1');

      expect(result).toEqual({
        riskScore: 0,
        shouldVoid: false,
        violationCount: 0,
      });
    });

    it('calculates weighted risk score from events', async () => {
      sessionHelpersMock.loadSession.mockResolvedValueOnce({
        browserEvents: [
          { type: 'TAB_SWITCH', timestamp: '2025-01-01T00:00:00Z' },
          { type: 'TAB_SWITCH', timestamp: '2025-01-01T00:01:00Z' },
          { type: 'DEVTOOLS_DETECTED', timestamp: '2025-01-01T00:02:00Z' },
        ],
      });

      const result = await service.evaluateViolations('s1', 't1');

      // 0.3 + 0.3 + 0.25 = 0.85
      expect(result.riskScore).toBeCloseTo(0.85);
      expect(result.violationCount).toBe(3);
      expect(result.shouldVoid).toBe(false);
    });

    it('flags shouldVoid when risk exceeds threshold', async () => {
      const events = Array.from({ length: 11 }, (_, i) => ({
        type: 'TAB_SWITCH',
        timestamp: `2025-01-01T00:${String(i).padStart(2, '0')}:00Z`,
      }));
      sessionHelpersMock.loadSession.mockResolvedValueOnce({
        browserEvents: events,
      });

      const result = await service.evaluateViolations('s1', 't1');

      // 11 * 0.3 = 3.3 > 3.0
      expect(result.shouldVoid).toBe(true);
      expect(result.riskScore).toBeGreaterThan(3.0);
    });

    it('uses default weight for unknown event types', async () => {
      sessionHelpersMock.loadSession.mockResolvedValueOnce({
        browserEvents: [
          { type: 'UNKNOWN_EVENT', timestamp: '2025-01-01T00:00:00Z' },
        ],
      });

      const result = await service.evaluateViolations('s1', 't1');

      expect(result.riskScore).toBeCloseTo(0.1);
    });

    it('handles null browserEvents gracefully', async () => {
      sessionHelpersMock.loadSession.mockResolvedValueOnce({
        browserEvents: null,
      });

      const result = await service.evaluateViolations('s1', 't1');

      expect(result).toEqual({
        riskScore: 0,
        shouldVoid: false,
        violationCount: 0,
      });
    });
  });

  describe('voidSessionOnViolation()', () => {
    it('updates session status to VOIDED and returns true', async () => {
      const chain = makeUpdateChain();
      mockTx.update.mockReturnValueOnce({ set: chain.set });

      const result = await service.voidSessionOnViolation('s1', 't1');

      expect(result).toBe(true);
      expect(chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'VOIDED' })
      );
    });
  });
});
