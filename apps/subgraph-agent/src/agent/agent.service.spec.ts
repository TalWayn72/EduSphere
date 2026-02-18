import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from './agent.service';

// ── DB mock factories ─────────────────────────────────────────────────────────
// The query chain used in AgentService:
//   findById:    select().from().where().limit()
//   findByUser:  select().from().where().orderBy().limit()
//   findByAgent: select().from().where().orderBy().limit()
//   findRunning: select().from().where().orderBy()
//   startExecution: insert().values().returning()
//   cancelExecution: update().set().where().returning()
//   processExecution: update().set().where()  +  select chain twice

const mockReturning = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();

// Where mock: must support both .limit() and .orderBy() and .returning()
const mockWhere = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    agent_executions: {
      id: 'id',
      agent_id: 'agent_id',
      user_id: 'user_id',
      status: 'status',
      started_at: 'started_at',
    },
    agent_definitions: { id: 'id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
  and: vi.fn((...args) => ({ and: args })),
}));

// ── AIService mock ────────────────────────────────────────────────────────────
const mockAIService = {
  execute: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_EXECUTION = {
  id: 'exec-1',
  agent_id: 'agent-1',
  user_id: 'user-1',
  input: { message: 'hello' },
  status: 'QUEUED',
  metadata: {},
  started_at: null,
  completed_at: null,
  output: null,
};

const MOCK_AGENT_DEF = {
  id: 'agent-1',
  name: 'Quiz Agent',
  template: 'QUIZ_ASSESS',
  config: { temperature: 0.7, maxTokens: 1000 },
};

/** Build a full mock chain for select().from().where().orderBy().limit() */
function makeSelectChain(resolvedValue: unknown[]) {
  const limit = vi.fn().mockResolvedValue(resolvedValue);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ limit, orderBy, returning: vi.fn().mockResolvedValue(resolvedValue) });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });
  const select = vi.fn().mockReturnValue({ from });
  return { select, from, where, orderBy, limit };
}

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up a generic select chain for each test
    const chain = makeSelectChain([MOCK_EXECUTION]);
    mockSelect.mockImplementation(chain.select.getMockImplementation() ?? (() => ({ from: chain.from })));
    mockSelect.mockReturnValue({ from: chain.from });

    // update chain: update().set().where().returning()
    const mockReturningFn = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
    const mockWhereFn = vi.fn().mockReturnValue({ returning: mockReturningFn, limit: vi.fn().mockResolvedValue([MOCK_EXECUTION]) });
    const mockSetFn = vi.fn().mockReturnValue({ where: mockWhereFn });
    mockUpdate.mockReturnValue({ set: mockSetFn });

    // insert chain
    const mockReturning2 = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
    const mockValues2 = vi.fn().mockReturnValue({ returning: mockReturning2 });
    mockInsert.mockReturnValue({ values: mockValues2 });

    service = new AgentService(mockAIService as any);
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns execution when found', async () => {
      const c = makeSelectChain([MOCK_EXECUTION]);
      mockSelect.mockReturnValue({ from: c.from });
      const result = await service.findById('exec-1');
      expect(result).toEqual(MOCK_EXECUTION);
    });

    it('returns null when no execution matches the id', async () => {
      const c = makeSelectChain([]);
      mockSelect.mockReturnValue({ from: c.from });
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('queries agent_executions table via select()', async () => {
      const c = makeSelectChain([MOCK_EXECUTION]);
      mockSelect.mockReturnValue({ from: c.from });
      await service.findById('exec-1');
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser()', () => {
    it('returns list of executions for user', async () => {
      const c = makeSelectChain([MOCK_EXECUTION]);
      mockSelect.mockReturnValue({ from: c.from });
      const result = await service.findByUser('user-1', 10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('applies the specified limit', async () => {
      const limitFn = vi.fn().mockResolvedValue([]);
      const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
      const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn, limit: vi.fn() });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn });
      await service.findByUser('user-1', 5);
      expect(limitFn).toHaveBeenCalledWith(5);
    });

    it('orders by started_at descending (calls orderBy)', async () => {
      const limitFn = vi.fn().mockResolvedValue([]);
      const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
      const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn, limit: vi.fn() });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn });
      await service.findByUser('user-1', 20);
      expect(orderByFn).toHaveBeenCalled();
    });
  });

  // ── findByAgent ───────────────────────────────────────────────────────────

  describe('findByAgent()', () => {
    it('returns executions for a given agent', async () => {
      const c = makeSelectChain([MOCK_EXECUTION]);
      mockSelect.mockReturnValue({ from: c.from });
      const result = await service.findByAgent('agent-1', 10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('passes limit to query', async () => {
      const limitFn = vi.fn().mockResolvedValue([]);
      const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
      const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn, limit: vi.fn() });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn });
      await service.findByAgent('agent-1', 15);
      expect(limitFn).toHaveBeenCalledWith(15);
    });
  });

  // ── findRunning ───────────────────────────────────────────────────────────

  describe('findRunning()', () => {
    it('returns running executions for user', async () => {
      const orderByFn = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn });
      const result = await service.findRunning('user-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('uses where clause with and() filter', async () => {
      const orderByFn = vi.fn().mockResolvedValue([]);
      const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      mockSelect.mockReturnValue({ from: fromFn });
      await service.findRunning('user-1');
      expect(whereFn).toHaveBeenCalled();
    });
  });

  // ── startExecution ────────────────────────────────────────────────────────

  describe('startExecution()', () => {
    beforeEach(() => {
      // processExecution runs async; mock its DB calls to succeed silently
      mockAIService.execute.mockResolvedValue({ text: 'AI response', usage: {} });

      // The select chain inside processExecution (findById then agent def lookup)
      const execLimit = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const execWhere = vi.fn().mockReturnValue({ limit: execLimit });
      const execFrom = vi.fn().mockReturnValue({ where: execWhere });

      const agentLimit = vi.fn().mockResolvedValue([MOCK_AGENT_DEF]);
      const agentWhere = vi.fn().mockReturnValue({ limit: agentLimit });
      const agentFrom = vi.fn().mockReturnValue({ where: agentWhere });

      mockSelect
        .mockReturnValueOnce({ from: execFrom })
        .mockReturnValueOnce({ from: agentFrom });

      // processExecution update calls
      const processWhere = vi.fn().mockResolvedValue([]);
      const processSet = vi.fn().mockReturnValue({ where: processWhere });
      mockUpdate.mockReturnValue({ set: processSet });
    });

    it('creates execution with QUEUED status initially', async () => {
      let capturedValues: any;
      const returning = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const values = vi.fn().mockImplementation((v) => {
        capturedValues = v;
        return { returning };
      });
      mockInsert.mockReturnValue({ values });
      await service.startExecution({ agentId: 'agent-1', userId: 'user-1', input: {} });
      expect(capturedValues.status).toBe('QUEUED');
    });

    it('sets agent_id from input.agentId', async () => {
      let capturedValues: any;
      const returning = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const values = vi.fn().mockImplementation((v) => {
        capturedValues = v;
        return { returning };
      });
      mockInsert.mockReturnValue({ values });
      await service.startExecution({ agentId: 'agent-42', userId: 'user-1', input: {} });
      expect(capturedValues.agent_id).toBe('agent-42');
    });

    it('sets user_id from input.userId', async () => {
      let capturedValues: any;
      const returning = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const values = vi.fn().mockImplementation((v) => {
        capturedValues = v;
        return { returning };
      });
      mockInsert.mockReturnValue({ values });
      await service.startExecution({ agentId: 'agent-1', userId: 'user-99', input: {} });
      expect(capturedValues.user_id).toBe('user-99');
    });

    it('defaults metadata to empty object when not provided', async () => {
      let capturedValues: any;
      const returning = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const values = vi.fn().mockImplementation((v) => {
        capturedValues = v;
        return { returning };
      });
      mockInsert.mockReturnValue({ values });
      await service.startExecution({ agentId: 'agent-1', userId: 'user-1', input: {} });
      expect(capturedValues.metadata).toEqual({});
    });

    it('uses provided metadata when supplied', async () => {
      let capturedValues: any;
      const returning = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const values = vi.fn().mockImplementation((v) => {
        capturedValues = v;
        return { returning };
      });
      mockInsert.mockReturnValue({ values });
      const meta = { courseId: 'course-1' };
      await service.startExecution({ agentId: 'agent-1', userId: 'user-1', input: {}, metadata: meta });
      expect(capturedValues.metadata).toEqual(meta);
    });

    it('returns the newly created execution record', async () => {
      const returning = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
      const values = vi.fn().mockReturnValue({ returning });
      mockInsert.mockReturnValue({ values });
      const result = await service.startExecution({ agentId: 'agent-1', userId: 'user-1', input: {} });
      expect(result).toEqual(MOCK_EXECUTION);
    });
  });

  // ── cancelExecution ───────────────────────────────────────────────────────

  describe('cancelExecution()', () => {
    it('updates status to CANCELLED', async () => {
      let capturedSet: any;
      const returning = vi.fn().mockResolvedValue([{ ...MOCK_EXECUTION, status: 'CANCELLED' }]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockImplementation((data) => {
        capturedSet = data;
        return { where };
      });
      mockUpdate.mockReturnValue({ set });
      await service.cancelExecution('exec-1');
      expect(capturedSet.status).toBe('CANCELLED');
    });

    it('sets completed_at on cancellation', async () => {
      let capturedSet: any;
      const returning = vi.fn().mockResolvedValue([{ ...MOCK_EXECUTION, status: 'CANCELLED' }]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockImplementation((data) => {
        capturedSet = data;
        return { where };
      });
      mockUpdate.mockReturnValue({ set });
      await service.cancelExecution('exec-1');
      expect(capturedSet.completed_at).toBeInstanceOf(Date);
    });

    it('returns the updated execution record', async () => {
      const cancelled = { ...MOCK_EXECUTION, status: 'CANCELLED' };
      const returning = vi.fn().mockResolvedValue([cancelled]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });
      const result = await service.cancelExecution('exec-1');
      expect(result).toEqual(cancelled);
    });
  });
});
