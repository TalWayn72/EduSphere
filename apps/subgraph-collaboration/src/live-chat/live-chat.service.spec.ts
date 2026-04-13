import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock ────────────────────────────────────────────────────────────────
const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    live_chat_messages: {
      id: 'id', session_id: 'session_id', user_id: 'user_id',
      tenant_id: 'tenant_id', is_deleted: 'is_deleted',
      is_pinned: 'is_pinned', created_at: 'created_at',
    },
  },
  eq: vi.fn((_a, _b) => 'eq'),
  and: vi.fn((...a: unknown[]) => a),
  desc: vi.fn((f: unknown) => `desc(${String(f)})`),
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  sql: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({ publish: vi.fn(), drain: vi.fn().mockResolvedValue(undefined) }),
  StringCodec: vi.fn(() => ({ encode: vi.fn((v: string) => v) })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  LiveChatSubjects: { CHAT_MESSAGE: 'live.chat.msg', CHAT_PIN: 'live.chat.pin', CHAT_DELETE: 'live.chat.del' },
}));

import { LiveChatService } from './live-chat.service.js';

const instructorCtx: AuthContext = {
  tenantId: 'tenant-1', userId: 'instructor-1',
  roles: ['INSTRUCTOR'], scopes: [], sub: 'instructor-1',
};
const studentCtx: AuthContext = {
  tenantId: 'tenant-1', userId: 'student-1',
  roles: ['STUDENT'], scopes: [], sub: 'student-1',
};

const sampleMsg = {
  id: 'msg-1', session_id: 'sess-1', user_id: 'student-1',
  content: 'Hello', message_type: 'TEXT', is_deleted: false,
  is_pinned: false, created_at: new Date('2026-01-01'),
};

function chainSelect(returnRows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnRows),
    orderBy: vi.fn().mockResolvedValue(returnRows),
  };
  vi.mocked(mockTx.select).mockReturnValue(chain as never);
  return chain;
}

function chainInsert(returnRows: unknown[]) {
  const chain = { values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue(returnRows) };
  vi.mocked(mockTx.insert).mockReturnValue(chain as never);
  return chain;
}

function chainUpdate(returnRows: unknown[]) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnRows),
  };
  vi.mocked(mockTx.update).mockReturnValue(chain as never);
  return chain;
}

describe('LiveChatService', () => {
  let service: LiveChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LiveChatService();
  });

  describe('sendMessage', () => {
    it('inserts message and returns row', async () => {
      chainSelect([]);
      chainInsert([sampleMsg]);
      const result = await service.sendMessage('sess-1', 'Hello', studentCtx);
      expect(mockTx.insert).toHaveBeenCalled();
      expect(result.id).toBe('msg-1');
    });

    it('strips HTML tags from content', async () => {
      chainSelect([]);
      let capturedContent = '';
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          capturedContent = vals['content'] as string;
          return { returning: vi.fn().mockResolvedValue([{ ...sampleMsg, content: capturedContent }]) };
        }),
      } as never);
      await service.sendMessage('sess-1', '<b>Hello</b>', studentCtx);
      expect(capturedContent).toBe('Hello');
    });
  });

  describe('pinMessage', () => {
    it('pins message when called by INSTRUCTOR', async () => {
      chainSelect([sampleMsg]);
      chainUpdate([{ ...sampleMsg, is_pinned: true }]);
      const result = await service.pinMessage('msg-1', instructorCtx);
      expect((result as typeof sampleMsg).is_pinned).toBe(true);
    });

    it('throws ForbiddenException when student tries to pin', async () => {
      await expect(service.pinMessage('msg-1', studentCtx)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when message not found', async () => {
      chainSelect([]);
      await expect(service.pinMessage('msg-1', instructorCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMessage', () => {
    it('soft-deletes message as owner', async () => {
      const ownerCtx: AuthContext = { ...studentCtx, userId: 'student-1' };
      chainSelect([sampleMsg]); // sampleMsg.user_id === 'student-1'
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockTx.update).mockReturnValue(updateChain as never);
      const result = await service.deleteMessage('msg-1', ownerCtx);
      expect(result).toBe(true);
    });

    it('soft-deletes message as instructor', async () => {
      chainSelect([sampleMsg]);
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockTx.update).mockReturnValue(updateChain as never);
      const result = await service.deleteMessage('msg-1', instructorCtx);
      expect(result).toBe(true);
    });

    it('throws ForbiddenException for non-owner student', async () => {
      const otherStudent: AuthContext = { ...studentCtx, userId: 'other-student' };
      chainSelect([sampleMsg]);
      await expect(service.deleteMessage('msg-1', otherStudent)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when message not found', async () => {
      chainSelect([]);
      await expect(service.deleteMessage('msg-1', instructorCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessages', () => {
    it('returns messages excluding deleted, ordered by created_at desc', async () => {
      const msgs = [sampleMsg, { ...sampleMsg, id: 'msg-2' }];
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(msgs),
      };
      vi.mocked(mockTx.select).mockReturnValue(chain as never);
      const result = await service.getMessages('sess-1', 50, studentCtx);
      expect(result).toHaveLength(2);
    });

    it('applies pagination cursor when provided', async () => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([sampleMsg]),
      };
      vi.mocked(mockTx.select).mockReturnValue(chain as never);
      const result = await service.getMessages('sess-1', 10, studentCtx, '2026-01-01T00:00:00Z');
      expect(result).toHaveLength(1);
    });
  });
});
