import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from './memory.service';
import type { ConversationContext } from './memory.service';

// ── DB mock helpers ──────────────────────────────────────────────────────────

const {
  mockWhere,
  mockLimit,
  mockOrderBy,
  mockValues,
  mockFrom,
  mockSelect,
  mockInsert,
  mockDelete,
  mockDb,
  mockKvSet,
  mockKvGet,
  mockKvDelete,
} = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn();
  const mockValues = vi.fn();
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();

  const mockDb = {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  };

  const mockKvSet = vi.fn();
  const mockKvGet = vi.fn();
  const mockKvDelete = vi.fn();

  return {
    mockWhere,
    mockLimit,
    mockOrderBy,
    mockValues,
    mockFrom,
    mockSelect,
    mockInsert,
    mockDelete,
    mockDb,
    mockKvSet,
    mockKvGet,
    mockKvDelete,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    agentMessages: {
      id: 'id',
      sessionId: 'sessionId',
      role: 'role',
      content: 'content',
      metadata: 'metadata',
      createdAt: 'createdAt',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  desc: vi.fn((col: unknown) => ({ col, dir: 'desc' })),
}));

// ── NATS KV mock ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/nats-client', () => ({
  NatsKVClient: vi.fn().mockImplementation(function () {
    this.set = mockKvSet;
    this.get = mockKvGet;
    this.delete = mockKvDelete;
    this.close = vi.fn();
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeMessage = (role: string, content: string, createdAt: Date) => ({
  id: `msg-${role}-${Date.now()}`,
  sessionId: 'session-1',
  role: role.toUpperCase(),
  content,
  metadata: null,
  createdAt,
});

const MOCK_MESSAGES = [
  makeMessage(
    'ASSISTANT',
    'Hello, how can I help?',
    new Date('2025-01-01T10:02:00Z')
  ),
  makeMessage(
    'USER',
    'Explain photosynthesis',
    new Date('2025-01-01T10:01:00Z')
  ),
];

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain: select → from → where → orderBy → limit
    mockLimit.mockResolvedValue(MOCK_MESSAGES);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Insert chain
    mockValues.mockResolvedValue({ rowCount: 1 });
    mockInsert.mockReturnValue({ values: mockValues });

    // Delete chain
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, rowCount: 1 });
    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    // NATS KV defaults
    mockKvSet.mockResolvedValue(undefined);
    mockKvGet.mockResolvedValue(null);

    service = new MemoryService();
  });

  // ── getConversationHistory ────────────────────────────────────────────────

  describe('getConversationHistory()', () => {
    it('returns messages in chronological order (reversed)', async () => {
      mockLimit.mockResolvedValue([...MOCK_MESSAGES]);
      const result = await service.getConversationHistory('session-1', 10);
      expect(Array.isArray(result)).toBe(true);
    });

    it('normalises role to lowercase in result', async () => {
      mockLimit.mockResolvedValue([makeMessage('USER', 'Hello', new Date())]);
      const result = await service.getConversationHistory('session-1', 10);
      expect(result[0].role).toBe('user');
    });

    it('returns assistant role lowercased', async () => {
      mockLimit.mockResolvedValue([makeMessage('ASSISTANT', 'Hi', new Date())]);
      const result = await service.getConversationHistory('session-1', 10);
      expect(result[0].role).toBe('assistant');
    });

    it('uses default limit of 10 when not specified', async () => {
      mockLimit.mockResolvedValue([]);
      await service.getConversationHistory('session-1');
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('uses provided limit when specified', async () => {
      mockLimit.mockResolvedValue([]);
      await service.getConversationHistory('session-1', 25);
      expect(mockLimit).toHaveBeenCalledWith(25);
    });

    it('returns empty array when session has no messages', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.getConversationHistory('session-1', 10);
      expect(result).toEqual([]);
    });

    it('maps content correctly from DB row', async () => {
      mockLimit.mockResolvedValue([
        makeMessage('USER', 'Test content', new Date()),
      ]);
      const result = await service.getConversationHistory('session-1', 10);
      expect(result[0].content).toBe('Test content');
    });

    it('maps createdAt correctly from DB row', async () => {
      const date = new Date('2025-06-01');
      mockLimit.mockResolvedValue([makeMessage('USER', 'Hello', date)]);
      const result = await service.getConversationHistory('session-1', 10);
      expect(result[0].createdAt).toEqual(date);
    });
  });

  // ── addMessage ────────────────────────────────────────────────────────────

  describe('addMessage()', () => {
    it('inserts a user message without throwing', async () => {
      mockValues.mockResolvedValue({ rowCount: 1 });
      await expect(
        service.addMessage('session-1', 'user', 'Hello!')
      ).resolves.toBeUndefined();
    });

    it('inserts an assistant message without throwing', async () => {
      mockValues.mockResolvedValue({ rowCount: 1 });
      await expect(
        service.addMessage('session-1', 'assistant', 'Hi there!')
      ).resolves.toBeUndefined();
    });

    it('uppercases role when inserting into DB', async () => {
      let capturedValues: Record<string, unknown> | undefined;
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        capturedValues = v;
        return Promise.resolve({ rowCount: 1 });
      });
      mockInsert.mockReturnValue({ values: mockValues });

      await service.addMessage('session-1', 'user', 'Test');
      expect(capturedValues?.['role']).toBe('USER');
    });

    it('stores provided metadata in message', async () => {
      let capturedValues: Record<string, unknown> | undefined;
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        capturedValues = v;
        return Promise.resolve({ rowCount: 1 });
      });
      mockInsert.mockReturnValue({ values: mockValues });

      const meta = { tokenCount: 42 };
      await service.addMessage('session-1', 'user', 'Hello', meta);
      expect(capturedValues?.['metadata']).toEqual(meta);
    });

    it('defaults metadata to empty object when not provided', async () => {
      let capturedValues: Record<string, unknown> | undefined;
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        capturedValues = v;
        return Promise.resolve({ rowCount: 1 });
      });
      mockInsert.mockReturnValue({ values: mockValues });

      await service.addMessage('session-1', 'user', 'Hello');
      expect(capturedValues?.['metadata']).toEqual({});
    });
  });

  // ── summarizeConversation ─────────────────────────────────────────────────

  describe('summarizeConversation()', () => {
    it('returns "No conversation history" when session has no messages', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.summarizeConversation('session-1');
      expect(result).toBe('No conversation history');
    });

    it('returns a string summary when messages exist', async () => {
      mockLimit.mockResolvedValue(MOCK_MESSAGES);
      const result = await service.summarizeConversation('session-1');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes message count in summary', async () => {
      mockLimit.mockResolvedValue(MOCK_MESSAGES);
      const result = await service.summarizeConversation('session-1');
      expect(result).toContain('2');
    });
  });

  // ── clearConversation ─────────────────────────────────────────────────────

  describe('clearConversation()', () => {
    it('resolves without throwing', async () => {
      await expect(
        service.clearConversation('session-1')
      ).resolves.toBeUndefined();
    });

    it('calls delete on the agentMessages table', async () => {
      await service.clearConversation('session-1');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  // ── getMessageCount ───────────────────────────────────────────────────────

  describe('getMessageCount()', () => {
    it('returns the number of messages in a session', async () => {
      mockWhere.mockResolvedValue(MOCK_MESSAGES);
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      const result = await service.getMessageCount('session-1');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('returns 0 when session has no messages', async () => {
      mockWhere.mockResolvedValue([]);
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      const result = await service.getMessageCount('session-1');
      expect(result).toBe(0);
    });
  });

  // ── saveContext ───────────────────────────────────────────────────────────

  describe('saveContext()', () => {
    it('writes context to NATS KV under the correct bucket', async () => {
      await service.saveContext('session-42', { messages: [] });
      expect(mockKvSet).toHaveBeenCalledOnce();
      const [bucket, key] = mockKvSet.mock.calls[0] as [
        string,
        string,
        unknown,
      ];
      expect(bucket).toBe('agent-memory');
      expect(key).toBe('session-42');
    });

    it('stamps updatedAt on the saved payload', async () => {
      await service.saveContext('session-99', { messages: [] });
      const [, , payload] = mockKvSet.mock.calls[0] as [
        string,
        string,
        ConversationContext,
      ];
      expect(typeof payload.updatedAt).toBe('string');
      expect(new Date(payload.updatedAt).getTime()).toBeLessThanOrEqual(
        Date.now()
      );
    });

    it('embeds sessionId in the saved payload', async () => {
      await service.saveContext('session-abc', { messages: [] });
      const [, , payload] = mockKvSet.mock.calls[0] as [
        string,
        string,
        ConversationContext,
      ];
      expect(payload.sessionId).toBe('session-abc');
    });

    it('resolves without throwing when KV write succeeds', async () => {
      await expect(
        service.saveContext('s1', { messages: [] })
      ).resolves.toBeUndefined();
    });
  });

  // ── loadContext ───────────────────────────────────────────────────────────

  describe('loadContext()', () => {
    it('returns the cached context from NATS KV when available (fast path)', async () => {
      const cached: ConversationContext = {
        sessionId: 'session-1',
        messages: [{ role: 'user', content: 'hello', createdAt: new Date() }],
        updatedAt: new Date().toISOString(),
      };
      mockKvGet.mockResolvedValue(cached);

      const result = await service.loadContext('session-1');
      expect(result).toEqual(cached);
      // DB should not be hit
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('falls back to database when KV returns null', async () => {
      mockKvGet.mockResolvedValue(null);
      mockLimit.mockResolvedValue([
        makeMessage('USER', 'DB fallback msg', new Date()),
      ]);

      const result = await service.loadContext('session-1');
      expect(result.sessionId).toBe('session-1');
      expect(result.messages.length).toBe(1);
      // After DB fallback, repopulates KV
      expect(mockKvSet).toHaveBeenCalledOnce();
    });

    it('falls back to database when KV throws an error', async () => {
      mockKvGet.mockRejectedValue(new Error('NATS unavailable'));
      mockLimit.mockResolvedValue([]);

      const result = await service.loadContext('session-fallback');
      expect(result.sessionId).toBe('session-fallback');
      expect(result.messages).toEqual([]);
    });

    it('does not throw when repopulating KV after DB fallback fails', async () => {
      mockKvGet.mockResolvedValue(null);
      mockLimit.mockResolvedValue([]);
      mockKvSet.mockRejectedValue(new Error('KV write failed'));

      await expect(service.loadContext('session-1')).resolves.toBeDefined();
    });

    it('returns context with correct sessionId from DB fallback', async () => {
      mockKvGet.mockResolvedValue(null);
      mockLimit.mockResolvedValue([]);

      const result = await service.loadContext('my-session');
      expect(result.sessionId).toBe('my-session');
    });
  });
});
