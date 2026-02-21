import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AgentSessionResolver } from './agent-session.resolver';
import type { AuthContext } from '@edusphere/auth';

// ── Service mocks ─────────────────────────────────────────────────────────────
const mockAgentSessionService = {
  findById: vi.fn(),
  findByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  complete: vi.fn(),
  cancel: vi.fn(),
};

const mockAgentMessageService = {
  findById: vi.fn(),
  findBySession: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  email: 'student@example.com',
  username: 'student',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

const MOCK_SESSION = {
  id: 'session-1',
  userId: 'user-1',
  agentType: 'TUTOR',
  status: 'ACTIVE',
  metadata: {},
  createdAt: '2025-01-01T00:00:00.000Z',
};

const MOCK_MESSAGE = {
  id: 'msg-1',
  sessionId: 'session-1',
  role: 'USER',
  content: 'Hello',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const buildContext = (withAuth = true) => ({
  req: { headers: {} },
  authContext: withAuth ? MOCK_AUTH : undefined,
});

describe('AgentSessionResolver', () => {
  let resolver: AgentSessionResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AgentSessionResolver(
      mockAgentSessionService as any,
      mockAgentMessageService as any
    );
  });

  // ── getAgentSession ───────────────────────────────────────────────────────

  describe('getAgentSession()', () => {
    it('delegates to agentSessionService.findById with id and authContext', async () => {
      mockAgentSessionService.findById.mockResolvedValue(MOCK_SESSION);
      const ctx = buildContext();
      const result = await resolver.getAgentSession('session-1', ctx);
      expect(mockAgentSessionService.findById).toHaveBeenCalledWith('session-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_SESSION);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      const ctx = buildContext(false);
      await expect(resolver.getAgentSession('session-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getMyAgentSessions ────────────────────────────────────────────────────

  describe('getMyAgentSessions()', () => {
    it('delegates to agentSessionService.findByUser with authContext userId', async () => {
      mockAgentSessionService.findByUser.mockResolvedValue([MOCK_SESSION]);
      const ctx = buildContext();
      const result = await resolver.getMyAgentSessions(ctx);
      expect(mockAgentSessionService.findByUser).toHaveBeenCalledWith('user-1', MOCK_AUTH);
      expect(result).toEqual([MOCK_SESSION]);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      const ctx = buildContext(false);
      await expect(resolver.getMyAgentSessions(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── getAgentTemplates ─────────────────────────────────────────────────────

  describe('getAgentTemplates()', () => {
    it('returns a list of templates without calling any service', async () => {
      const _ctx = buildContext();
      const result = await resolver.getAgentTemplates();
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns at least one template', async () => {
      const _ctx = buildContext();
      const result = await resolver.getAgentTemplates();
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns templates with required fields: id, name, templateType, systemPrompt', async () => {
      const result = await resolver.getAgentTemplates();
      for (const template of result) {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('templateType');
        expect(template).toHaveProperty('systemPrompt');
      }
    });

    it('includes TUTOR template', async () => {
      const result = await resolver.getAgentTemplates();
      const tutor = result.find((t: any) => t.templateType === 'TUTOR');
      expect(tutor).toBeDefined();
    });

    it('includes QUIZ_GENERATOR template', async () => {
      const result = await resolver.getAgentTemplates();
      const quiz = result.find((t: any) => t.templateType === 'QUIZ_GENERATOR');
      expect(quiz).toBeDefined();
    });

    it('includes DEBATE_FACILITATOR template', async () => {
      const result = await resolver.getAgentTemplates();
      const debate = result.find((t: any) => t.templateType === 'DEBATE_FACILITATOR');
      expect(debate).toBeDefined();
    });

    it('includes EXPLANATION_GENERATOR template', async () => {
      const result = await resolver.getAgentTemplates();
      const explainer = result.find((t: any) => t.templateType === 'EXPLANATION_GENERATOR');
      expect(explainer).toBeDefined();
    });
  });

  // ── startAgentSession ─────────────────────────────────────────────────────

  describe('startAgentSession()', () => {
    it('creates a new session and returns it', async () => {
      mockAgentSessionService.create.mockResolvedValue(MOCK_SESSION);
      const ctx = buildContext();
      const result = await resolver.startAgentSession('TUTOR', {}, 'en', ctx);
      expect(result).toEqual(MOCK_SESSION);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      const ctx = buildContext(false);
      await expect(resolver.startAgentSession('TUTOR', {}, 'en', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws BadRequestException for invalid templateType', async () => {
      const ctx = buildContext();
      await expect(resolver.startAgentSession('INVALID_TYPE', {}, 'en', ctx)).rejects.toThrow(
        BadRequestException
      );
    });

    it('passes userId from authContext to session create', async () => {
      mockAgentSessionService.create.mockResolvedValue(MOCK_SESSION);
      const ctx = buildContext();
      await resolver.startAgentSession('TUTOR', {}, 'en', ctx);
      expect(mockAgentSessionService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
        MOCK_AUTH
      );
    });

    it('accepts CHAVRUTA_DEBATE as valid template type', async () => {
      mockAgentSessionService.create.mockResolvedValue(MOCK_SESSION);
      const ctx = buildContext();
      await expect(
        resolver.startAgentSession('CHAVRUTA_DEBATE', {}, 'en', ctx)
      ).resolves.toBeDefined();
    });

    it('accepts QUIZ_ASSESS as valid template type', async () => {
      mockAgentSessionService.create.mockResolvedValue(MOCK_SESSION);
      const ctx = buildContext();
      await expect(
        resolver.startAgentSession('QUIZ_ASSESS', {}, 'en', ctx)
      ).resolves.toBeDefined();
    });

    it('accepts SUMMARIZE as valid template type', async () => {
      mockAgentSessionService.create.mockResolvedValue(MOCK_SESSION);
      const ctx = buildContext();
      await expect(
        resolver.startAgentSession('SUMMARIZE', {}, 'en', ctx)
      ).resolves.toBeDefined();
    });
  });

  // ── sendMessage ───────────────────────────────────────────────────────────

  describe('sendMessage()', () => {
    const VALID_SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';

    it('creates user message and returns assistant message', async () => {
      mockAgentMessageService.create
        .mockResolvedValueOnce(MOCK_MESSAGE)
        .mockResolvedValueOnce({ ...MOCK_MESSAGE, role: 'ASSISTANT', content: `Echo: Hello` });
      const ctx = buildContext();
      const result = await resolver.sendMessage(VALID_SESSION_ID, 'Hello', ctx);
      expect(result.role).toBe('ASSISTANT');
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      const ctx = buildContext(false);
      await expect(resolver.sendMessage(VALID_SESSION_ID, 'Hello', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws BadRequestException for empty content', async () => {
      const ctx = buildContext();
      await expect(resolver.sendMessage(VALID_SESSION_ID, '', ctx)).rejects.toThrow(
        BadRequestException
      );
    });

    it('throws BadRequestException for invalid session UUID', async () => {
      const ctx = buildContext();
      await expect(resolver.sendMessage('not-a-uuid', 'Hello', ctx)).rejects.toThrow(
        BadRequestException
      );
    });

    it('creates user message with role USER', async () => {
      mockAgentMessageService.create
        .mockResolvedValueOnce(MOCK_MESSAGE)
        .mockResolvedValueOnce({ ...MOCK_MESSAGE, role: 'ASSISTANT' });
      const ctx = buildContext();
      await resolver.sendMessage(VALID_SESSION_ID, 'Hello', ctx);
      expect(mockAgentMessageService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'USER', content: 'Hello' }),
        MOCK_AUTH
      );
    });
  });

  // ── endSession ────────────────────────────────────────────────────────────

  describe('endSession()', () => {
    it('calls agentSessionService.complete with session id', async () => {
      mockAgentSessionService.complete.mockResolvedValue({ ...MOCK_SESSION, status: 'COMPLETED' });
      const ctx = buildContext();
      const result = await resolver.endSession('session-1', ctx);
      expect(mockAgentSessionService.complete).toHaveBeenCalledWith('session-1', MOCK_AUTH);
      expect(result).toBe(true);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      const ctx = buildContext(false);
      await expect(resolver.endSession('session-1', ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── messageStream subscription ────────────────────────────────────────────

  describe('messageStream()', () => {
    it('returns an async iterable from pubSub', () => {
      const iterator = resolver.subscribeToMessageStream('session-1');
      expect(iterator).toBeDefined();
      expect(typeof iterator[Symbol.asyncIterator]).toBe('function');
    });
  });

  // ── getMessages field resolver ────────────────────────────────────────────

  describe('getMessages() field resolver', () => {
    it('delegates to agentMessageService.findBySession with session id', async () => {
      mockAgentMessageService.findBySession.mockResolvedValue([MOCK_MESSAGE]);
      const ctx = buildContext();
      const result = await resolver.getMessages({ id: 'session-1' }, ctx);
      expect(mockAgentMessageService.findBySession).toHaveBeenCalledWith('session-1', MOCK_AUTH);
      expect(result).toEqual([MOCK_MESSAGE]);
    });
  });
});
