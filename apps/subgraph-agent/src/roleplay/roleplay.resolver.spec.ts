import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RoleplayService mock ─────────────────────────────────────────────────────
const mockListScenarios = vi.fn();
const mockCreateScenario = vi.fn();

vi.mock('./roleplay.service.js', () => ({
  RoleplayService: class {
    listScenarios = mockListScenarios;
    createScenario = mockCreateScenario;
  },
}));

// ─── RoleplaySessionService mock ──────────────────────────────────────────────
const mockGetSession = vi.fn();
const mockStartSession = vi.fn();
const mockSendMessage = vi.fn();

vi.mock('./roleplay-session.service.js', () => ({
  RoleplaySessionService: class {
    getSession = mockGetSession;
    startSession = mockStartSession;
    sendMessage = mockSendMessage;
  },
}));

// ─── DB mock ─────────────────────────────────────────────────────────────────
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  scenario_templates: {},
  scenario_sessions: {},
}));

import { RoleplayResolver } from './roleplay.resolver.js';
import { RoleplayService } from './roleplay.service.js';
import { RoleplaySessionService } from './roleplay-session.service.js';

const makeCtx = (userId = 'user-1', tenantId = 'tenant-1') => ({
  req: {
    user: { sub: userId },
    headers: { 'x-tenant-id': tenantId },
  },
});

const sampleScenario = {
  id: 's-1',
  title: 'Job Interview',
  domain: 'CAREER',
  difficulty_level: 'INTERMEDIATE',
  scene_description: 'You are in a job interview',
  max_turns: 10,
  is_builtin: true,
};

const sampleSession = {
  id: 'sess-1',
  scenario_id: 's-1',
  status: 'IN_PROGRESS',
  turn_count: 2,
  evaluation_result: null,
  started_at: new Date('2024-01-01'),
  completed_at: null,
};

describe('RoleplayResolver', () => {
  let resolver: RoleplayResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new RoleplayResolver(
      new RoleplayService({} as never),
      new RoleplaySessionService({} as never)
    );
  });

  describe('scenarioTemplates()', () => {
    it('returns mapped scenarios from service', async () => {
      mockListScenarios.mockResolvedValue([sampleScenario]);

      const result = await resolver.scenarioTemplates(makeCtx());

      expect(mockListScenarios).toHaveBeenCalledWith('tenant-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.difficultyLevel).toBe('INTERMEDIATE');
      expect(result[0]!.isBuiltin).toBe(true);
    });

    it('returns empty array when no scenarios', async () => {
      mockListScenarios.mockResolvedValue([]);
      const result = await resolver.scenarioTemplates(makeCtx());
      expect(result).toEqual([]);
    });
  });

  describe('myScenarioSession()', () => {
    it('returns mapped session when found', async () => {
      mockGetSession.mockResolvedValue(sampleSession);

      const result = await resolver.myScenarioSession('sess-1', makeCtx());

      expect(mockGetSession).toHaveBeenCalledWith('sess-1', 'user-1', 'tenant-1');
      expect(result!.id).toBe('sess-1');
      expect(result!.status).toBe('IN_PROGRESS');
      expect(result!.evaluation).toBeNull();
    });

    it('returns null when session not found', async () => {
      mockGetSession.mockResolvedValue(null);
      const result = await resolver.myScenarioSession('missing', makeCtx());
      expect(result).toBeNull();
    });
  });

  describe('startRoleplaySession()', () => {
    it('starts session and returns mapped result', async () => {
      mockStartSession.mockResolvedValue(sampleSession);

      const result = await resolver.startRoleplaySession('s-1', makeCtx());

      expect(mockStartSession).toHaveBeenCalledWith('s-1', 'user-1', 'tenant-1');
      expect(result.scenarioId).toBe('s-1');
      expect(result.turnCount).toBe(2);
    });
  });

  describe('sendRoleplayMessage()', () => {
    it('delegates to sessionService.sendMessage and returns boolean', async () => {
      mockSendMessage.mockResolvedValue(true);

      const result = await resolver.sendRoleplayMessage(
        'sess-1',
        'Hello agent!',
        makeCtx()
      );

      expect(mockSendMessage).toHaveBeenCalledWith(
        'sess-1',
        'Hello agent!',
        'user-1',
        'tenant-1'
      );
      expect(result).toBe(true);
    });
  });

  describe('createScenarioTemplate()', () => {
    it('creates and maps scenario', async () => {
      mockCreateScenario.mockResolvedValue(sampleScenario);

      const result = await resolver.createScenarioTemplate(
        'Job Interview',
        'CAREER',
        'INTERMEDIATE',
        'A friendly interviewer',
        'Office setting',
        undefined,
        makeCtx()
      );

      expect(result.title).toBe('Job Interview');
      expect(result.difficultyLevel).toBe('INTERMEDIATE');
    });
  });
});
