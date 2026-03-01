import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── AgentMessageService mock ─────────────────────────────────────────────────
const mockFindById = vi.fn();

vi.mock('./agent-message.service', () => ({
  AgentMessageService: class {
    findById = mockFindById;
  },
}));

// ─── DB mock ─────────────────────────────────────────────────────────────────
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
}));

import { AgentMessageResolver } from './agent-message.resolver.js';
import { AgentMessageService } from './agent-message.service.js';

const makeCtx = (hasAuth = true) =>
  hasAuth
    ? {
        authContext: {
          userId: 'user-1',
          tenantId: 'tenant-1',
          roles: ['STUDENT'],
        },
      }
    : {};

describe('AgentMessageResolver', () => {
  let resolver: AgentMessageResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AgentMessageResolver(
      new AgentMessageService({} as never)
    );
  });

  describe('resolveReference()', () => {
    it('delegates to agentMessageService.findById with authContext', async () => {
      const message = { id: 'msg-1', content: 'hello', role: 'AGENT' };
      mockFindById.mockResolvedValue(message);

      const ctx = makeCtx();
      const result = await resolver.resolveReference(
        { __typename: 'AgentMessage', id: 'msg-1' },
        ctx
      );

      expect(mockFindById).toHaveBeenCalledWith(
        'msg-1',
        (ctx as { authContext: unknown }).authContext
      );
      expect(result).toEqual(message);
    });

    it('throws UnauthorizedException when authContext is missing', async () => {
      const ctx = makeCtx(false);
      await expect(
        resolver.resolveReference({ __typename: 'AgentMessage', id: 'msg-1' }, ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('passes the id from reference to the service', async () => {
      const ctx = makeCtx();
      mockFindById.mockResolvedValue({ id: 'msg-abc' });

      await resolver.resolveReference(
        { __typename: 'AgentMessage', id: 'msg-abc' },
        ctx
      );

      expect(mockFindById).toHaveBeenCalledWith('msg-abc', expect.anything());
    });

    it('returns null when service returns null', async () => {
      const ctx = makeCtx();
      mockFindById.mockResolvedValue(null);

      const result = await resolver.resolveReference(
        { __typename: 'AgentMessage', id: 'missing' },
        ctx
      );

      expect(result).toBeNull();
    });

    it('propagates service errors', async () => {
      const ctx = makeCtx();
      mockFindById.mockRejectedValue(new Error('DB error'));

      await expect(
        resolver.resolveReference(
          { __typename: 'AgentMessage', id: 'msg-1' },
          ctx
        )
      ).rejects.toThrow('DB error');
    });
  });
});
