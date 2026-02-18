import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentResolver } from './agent.resolver';

// ── AgentService mock ─────────────────────────────────────────────────────────
const mockAgentService = {
  findById: vi.fn(),
  findByUser: vi.fn(),
  findByAgent: vi.fn(),
  findRunning: vi.fn(),
  startExecution: vi.fn(),
  cancelExecution: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_EXECUTION = {
  id: 'exec-1',
  agent_id: 'agent-1',
  user_id: 'user-1',
  input: { message: 'hello' },
  status: 'QUEUED',
  metadata: {},
};

describe('AgentResolver', () => {
  let resolver: AgentResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AgentResolver(mockAgentService as any);
  });

  // ── getAgentExecution ────────────────────────────────────────────────────

  describe('getAgentExecution()', () => {
    it('delegates to agentService.findById with correct id', async () => {
      mockAgentService.findById.mockResolvedValue(MOCK_EXECUTION);
      const result = await resolver.getAgentExecution('exec-1');
      expect(mockAgentService.findById).toHaveBeenCalledWith('exec-1');
      expect(result).toEqual(MOCK_EXECUTION);
    });

    it('returns null when execution is not found', async () => {
      mockAgentService.findById.mockResolvedValue(null);
      const result = await resolver.getAgentExecution('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── getAgentExecutionsByUser ─────────────────────────────────────────────

  describe('getAgentExecutionsByUser()', () => {
    it('delegates to agentService.findByUser with userId and limit', async () => {
      mockAgentService.findByUser.mockResolvedValue([MOCK_EXECUTION]);
      const result = await resolver.getAgentExecutionsByUser('user-1', 10);
      expect(mockAgentService.findByUser).toHaveBeenCalledWith('user-1', 10);
      expect(result).toEqual([MOCK_EXECUTION]);
    });

    it('passes custom limit correctly', async () => {
      mockAgentService.findByUser.mockResolvedValue([]);
      await resolver.getAgentExecutionsByUser('user-2', 50);
      expect(mockAgentService.findByUser).toHaveBeenCalledWith('user-2', 50);
    });

    it('returns empty array when user has no executions', async () => {
      mockAgentService.findByUser.mockResolvedValue([]);
      const result = await resolver.getAgentExecutionsByUser('user-1', 20);
      expect(result).toEqual([]);
    });
  });

  // ── getAgentExecutionsByAgent ────────────────────────────────────────────

  describe('getAgentExecutionsByAgent()', () => {
    it('delegates to agentService.findByAgent with agentId and limit', async () => {
      mockAgentService.findByAgent.mockResolvedValue([MOCK_EXECUTION]);
      const result = await resolver.getAgentExecutionsByAgent('agent-1', 10);
      expect(mockAgentService.findByAgent).toHaveBeenCalledWith('agent-1', 10);
      expect(result).toEqual([MOCK_EXECUTION]);
    });

    it('returns multiple executions for an agent', async () => {
      const executions = [MOCK_EXECUTION, { ...MOCK_EXECUTION, id: 'exec-2' }];
      mockAgentService.findByAgent.mockResolvedValue(executions);
      const result = await resolver.getAgentExecutionsByAgent('agent-1', 20);
      expect(result).toHaveLength(2);
    });
  });

  // ── getRunningExecutions ─────────────────────────────────────────────────

  describe('getRunningExecutions()', () => {
    it('delegates to agentService.findRunning with userId', async () => {
      const running = [{ ...MOCK_EXECUTION, status: 'RUNNING' }];
      mockAgentService.findRunning.mockResolvedValue(running);
      const result = await resolver.getRunningExecutions('user-1');
      expect(mockAgentService.findRunning).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(running);
    });

    it('returns empty array when no running executions', async () => {
      mockAgentService.findRunning.mockResolvedValue([]);
      const result = await resolver.getRunningExecutions('user-1');
      expect(result).toEqual([]);
    });
  });

  // ── startAgentExecution ──────────────────────────────────────────────────

  describe('startAgentExecution()', () => {
    it('delegates to agentService.startExecution with input', async () => {
      mockAgentService.startExecution.mockResolvedValue(MOCK_EXECUTION);
      const input = { agentId: 'agent-1', userId: 'user-1', input: { msg: 'hi' } };
      const result = await resolver.startAgentExecution(input);
      expect(mockAgentService.startExecution).toHaveBeenCalledWith(input);
      expect(result).toEqual(MOCK_EXECUTION);
    });

    it('returns the created execution', async () => {
      mockAgentService.startExecution.mockResolvedValue(MOCK_EXECUTION);
      const result = await resolver.startAgentExecution({ agentId: 'a', userId: 'u', input: {} });
      expect(result).toHaveProperty('id', 'exec-1');
    });

    it('propagates error when startExecution fails', async () => {
      mockAgentService.startExecution.mockRejectedValue(new Error('DB error'));
      await expect(
        resolver.startAgentExecution({ agentId: 'a', userId: 'u', input: {} })
      ).rejects.toThrow('DB error');
    });
  });

  // ── cancelAgentExecution ─────────────────────────────────────────────────

  describe('cancelAgentExecution()', () => {
    it('delegates to agentService.cancelExecution with id', async () => {
      const cancelled = { ...MOCK_EXECUTION, status: 'CANCELLED' };
      mockAgentService.cancelExecution.mockResolvedValue(cancelled);
      const result = await resolver.cancelAgentExecution('exec-1');
      expect(mockAgentService.cancelExecution).toHaveBeenCalledWith('exec-1');
      expect(result).toEqual(cancelled);
    });

    it('returns execution with CANCELLED status', async () => {
      const cancelled = { ...MOCK_EXECUTION, status: 'CANCELLED' };
      mockAgentService.cancelExecution.mockResolvedValue(cancelled);
      const result = await resolver.cancelAgentExecution('exec-1');
      expect(result.status).toBe('CANCELLED');
    });
  });

  // ── executionStatusChanged subscription ──────────────────────────────────

  describe('executionStatusChanged()', () => {
    it('returns an async iterable from pubSub', () => {
      const iterator = resolver.executionStatusChanged();
      // PubSub asyncIterableIterator returns an object with Symbol.asyncIterator
      expect(iterator).toBeDefined();
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function');
    });
  });
});
