import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock ────────────────────────────────────────────────────────────────
const mockTx = {
  insert: vi.fn(),
};

const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    live_reactions: {
      id: 'id', session_id: 'session_id', user_id: 'user_id',
      tenant_id: 'tenant_id', emoji: 'emoji', stream_ts: 'stream_ts',
    },
  },
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

vi.mock('./nats-pubsub.helper', () => ({
  publishReactionBurst: vi.fn().mockResolvedValue(undefined),
}));

import { LiveReactionService } from './live-reaction.service.js';
import { publishReactionBurst } from './nats-pubsub.helper.js';

const studentCtx: AuthContext = {
  tenantId: 'tenant-1', userId: 'student-1',
  roles: ['STUDENT'], scopes: [], sub: 'student-1',
};

const student2Ctx: AuthContext = {
  tenantId: 'tenant-1', userId: 'student-2',
  roles: ['STUDENT'], scopes: [], sub: 'student-2',
};

describe('LiveReactionService', () => {
  let service: LiveReactionService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(mockTx.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as never);
    service = new LiveReactionService();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Allow any pending burst flush timers to be cleaned up
    void service.onModuleDestroy();
  });

  describe('sendReaction', () => {
    it('inserts reaction record and returns true', async () => {
      const result = await service.sendReaction('sess-1', '👍', studentCtx);
      expect(mockTx.insert).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('inserts reaction with streamTs when provided', async () => {
      let capturedValues: Record<string, unknown> | undefined;
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockImplementation((v: Record<string, unknown>) => {
          capturedValues = v;
          return Promise.resolve(undefined);
        }),
      } as never);
      await service.sendReaction('sess-1', '❤️', studentCtx, 12345);
      expect(capturedValues?.['stream_ts']).toBe(12345);
    });
  });

  describe('burst aggregation', () => {
    it('accumulates multiple reactions within 2s window then flushes', async () => {
      // Send 3 reactions from 2 different users
      await service.sendReaction('sess-1', '👍', studentCtx);
      await service.sendReaction('sess-1', '👍', student2Ctx);
      await service.sendReaction('sess-1', '👍', studentCtx);

      // Burst should NOT have fired yet
      expect(publishReactionBurst).not.toHaveBeenCalled();

      // Advance timer past 2s window
      await vi.advanceTimersByTimeAsync(2100);

      expect(publishReactionBurst).toHaveBeenCalledOnce();
      const call = vi.mocked(publishReactionBurst).mock.calls[0];
      expect(call[0]).toBe('sess-1');
      const burst = call[1] as { emoji: string; count: number };
      expect(burst.emoji).toBe('👍');
      expect(burst.count).toBe(3);
    });

    it('creates separate burst buffers for different emojis', async () => {
      await service.sendReaction('sess-1', '👍', studentCtx);
      await service.sendReaction('sess-1', '❤️', studentCtx);

      await vi.advanceTimersByTimeAsync(2100);

      expect(publishReactionBurst).toHaveBeenCalledTimes(2);
      const emojis = vi.mocked(publishReactionBurst).mock.calls.map(
        (c) => (c[1] as { emoji: string }).emoji
      );
      expect(emojis).toContain('👍');
      expect(emojis).toContain('❤️');
    });

    it('creates separate burst buffers for different sessions', async () => {
      await service.sendReaction('sess-1', '👍', studentCtx);
      await service.sendReaction('sess-2', '👍', studentCtx);

      await vi.advanceTimersByTimeAsync(2100);

      expect(publishReactionBurst).toHaveBeenCalledTimes(2);
      const sessions = vi.mocked(publishReactionBurst).mock.calls.map((c) => c[0]);
      expect(sessions).toContain('sess-1');
      expect(sessions).toContain('sess-2');
    });

    it('includes unique user IDs in burst recentUsers (up to 10)', async () => {
      for (let i = 0; i < 3; i++) {
        await service.sendReaction('sess-1', '🎉', studentCtx);
        await service.sendReaction('sess-1', '🎉', student2Ctx);
      }

      await vi.advanceTimersByTimeAsync(2100);

      const burst = vi.mocked(publishReactionBurst).mock.calls[0][1] as { recentUsers: string[] };
      expect(burst.recentUsers.length).toBeLessThanOrEqual(10);
      expect(burst.recentUsers).toContain('student-1');
      expect(burst.recentUsers).toContain('student-2');
    });
  });

  describe('onModuleDestroy', () => {
    it('clears all pending burst timers without flushing', async () => {
      await service.sendReaction('sess-1', '👍', studentCtx);
      await service.onModuleDestroy();

      // Advance timer — burst should NOT have been published since buffer was cleared
      await vi.advanceTimersByTimeAsync(3000);
      expect(publishReactionBurst).not.toHaveBeenCalled();
    });
  });
});
