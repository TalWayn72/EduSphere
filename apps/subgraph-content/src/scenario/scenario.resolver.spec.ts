import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { ScenarioResolver } from './scenario.resolver.js';
import type { ScenarioService } from './scenario.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockGetScenarioNode = vi.fn();
const mockGetScenarioProgress = vi.fn();
const mockRecordChoice = vi.fn();

const mockService = {
  getScenarioNode: mockGetScenarioNode,
  getScenarioProgress: mockGetScenarioProgress,
  recordChoice: mockRecordChoice,
} as unknown as ScenarioService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = { userId: 'user-1', tenantId: 'tenant-1', roles: ['STUDENT'] };
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const MOCK_NODE = {
  id: 'node-1',
  type: 'SCENARIO_BRANCH',
  title: 'The Crossroads',
  content: 'You stand at a fork in the road.',
  choices: [
    { id: 'choice-a', text: 'Go left', nextContentItemId: 'node-2' },
    { id: 'choice-b', text: 'Go right', nextContentItemId: 'node-3' },
  ],
};

const MOCK_PROGRESS = {
  scenarioRootId: 'node-root',
  visitedNodes: ['node-1'],
  choicesMade: [{ fromNodeId: 'node-1', choiceId: 'choice-a' }],
  completedAt: null,
};

const MOCK_CHOICE_RESULT = {
  nextNodeId: 'node-2',
  progress: MOCK_PROGRESS,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScenarioResolver', () => {
  let resolver: ScenarioResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new ScenarioResolver(mockService);
  });

  // ── requireAuth ────────────────────────────────────────────────────────────

  describe('requireAuth (tested via getScenarioNode)', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(
        resolver.getScenarioNode('item-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockGetScenarioNode).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = makeCtx({
        userId: undefined as unknown as string,
        tenantId: 't1',
        roles: [],
      });
      await expect(resolver.getScenarioNode('item-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(resolver.getScenarioNode('item-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getScenarioNode ───────────────────────────────────────────────────────

  describe('getScenarioNode()', () => {
    it('delegates to service.getScenarioNode with contentItemId and TenantContext', async () => {
      mockGetScenarioNode.mockResolvedValueOnce(MOCK_NODE);

      const result = await resolver.getScenarioNode('node-1', makeCtx());

      expect(mockGetScenarioNode).toHaveBeenCalledWith(
        'node-1',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
      expect(result).toEqual(MOCK_NODE);
    });

    it('builds TenantContext with role from first roles entry', async () => {
      mockGetScenarioNode.mockResolvedValueOnce(MOCK_NODE);
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: 't1',
        roles: ['INSTRUCTOR'],
      });

      await resolver.getScenarioNode('node-1', ctx);

      const [, tenantCtxArg] = mockGetScenarioNode.mock.calls[0];
      expect(tenantCtxArg.userRole).toBe('INSTRUCTOR');
    });

    it('defaults userRole to STUDENT when roles array is empty', async () => {
      mockGetScenarioNode.mockResolvedValueOnce(MOCK_NODE);
      const ctx = makeCtx({ userId: 'u1', tenantId: 't1', roles: [] });

      await resolver.getScenarioNode('node-1', ctx);

      const [, tenantCtxArg] = mockGetScenarioNode.mock.calls[0];
      expect(tenantCtxArg.userRole).toBe('STUDENT');
    });
  });

  // ── getMyScenarioProgress ─────────────────────────────────────────────────

  describe('getMyScenarioProgress()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.getMyScenarioProgress('root-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.getScenarioProgress with scenarioRootId and TenantContext', async () => {
      mockGetScenarioProgress.mockResolvedValueOnce(MOCK_PROGRESS);

      const result = await resolver.getMyScenarioProgress(
        'node-root',
        makeCtx()
      );

      expect(mockGetScenarioProgress).toHaveBeenCalledWith(
        'node-root',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
      expect(result).toEqual(MOCK_PROGRESS);
    });
  });

  // ── recordScenarioChoice ──────────────────────────────────────────────────

  describe('recordScenarioChoice()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.recordScenarioChoice('node-1', 'choice-a', 'root-1', noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockRecordChoice).not.toHaveBeenCalled();
    });

    it('delegates to service.recordChoice with all args and TenantContext', async () => {
      mockRecordChoice.mockResolvedValueOnce(MOCK_CHOICE_RESULT);

      const result = await resolver.recordScenarioChoice(
        'node-1',
        'choice-a',
        'node-root',
        makeCtx()
      );

      expect(mockRecordChoice).toHaveBeenCalledWith(
        'node-1',
        'choice-a',
        'node-root',
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
      expect(result).toEqual(MOCK_CHOICE_RESULT);
    });
  });
});
