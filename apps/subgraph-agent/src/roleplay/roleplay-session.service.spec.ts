import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
  })),
  scenario_templates: {
    id: 'id',
    tenant_id: 'tenant_id',
    is_active: 'is_active',
    scenario_id: 'scenario_id',
  },
  scenario_sessions: {
    id: 'id',
    user_id: 'user_id',
    scenario_id: 'scenario_id',
    tenant_id: 'tenant_id',
    status: 'status',
    turn_count: 'turn_count',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  eq: vi.fn((_col: unknown, _val: unknown) => 'eq-cond'),
}));

// ─── LlmConsentGuard mock ─────────────────────────────────────────────────────
const mockAssertConsent = vi.fn().mockResolvedValue(undefined);

vi.mock('../ai/llm-consent.guard.js', () => ({
  LlmConsentGuard: class {
    assertConsent = mockAssertConsent;
  },
}));

// ─── roleplay.workflow mock ───────────────────────────────────────────────────
const mockWorkflowInvoke = vi.fn().mockResolvedValue({});

vi.mock('../ai/roleplay.workflow.js', () => ({
  createRoleplayWorkflow: vi.fn(() => ({ invoke: mockWorkflowInvoke })),
}));

import { RoleplaySessionService } from './roleplay-session.service.js';
import { LlmConsentGuard } from '../ai/llm-consent.guard.js';

const sampleTemplate = {
  id: 'tmpl-1',
  tenant_id: 'tenant-1',
  is_active: true,
  title: 'Interview',
  domain: 'CAREER',
  difficulty_level: 'INTERMEDIATE',
  character_persona: 'A hiring manager',
  scene_description: 'Office setting',
  evaluation_rubric: [],
  max_turns: 5,
  is_builtin: true,
};

const sampleSession = {
  id: 'sess-1',
  scenario_id: 'tmpl-1',
  user_id: 'user-1',
  tenant_id: 'tenant-1',
  status: 'IN_PROGRESS',
  turn_count: 0,
  evaluation_result: null,
  started_at: new Date(),
  completed_at: null,
};

function mockSelectChain(result: unknown[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

describe('RoleplaySessionService', () => {
  let service: RoleplaySessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RoleplaySessionService(new LlmConsentGuard({} as never));
  });

  describe('startSession()', () => {
    it('throws NotFoundException when template not found', async () => {
      mockSelectChain([]); // template not found
      await expect(
        service.startSession('missing-tmpl', 'user-1', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('calls consent guard before accessing LLM', async () => {
      mockSelectChain([sampleTemplate]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([sampleSession]),
        }),
      });

      await service.startSession('tmpl-1', 'user-1', 'tenant-1');
      expect(mockAssertConsent).toHaveBeenCalledOnce();
    });

    it('returns the created session', async () => {
      mockSelectChain([sampleTemplate]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([sampleSession]),
        }),
      });

      const result = await service.startSession('tmpl-1', 'user-1', 'tenant-1');
      expect(result.id).toBe('sess-1');
    });

    it('throws when DB insert returns empty', async () => {
      mockSelectChain([sampleTemplate]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.startSession('tmpl-1', 'user-1', 'tenant-1')
      ).rejects.toThrow('Failed to create scenario session');
    });
  });

  describe('getSession()', () => {
    it('returns session when found', async () => {
      mockSelectChain([sampleSession]);
      const result = await service.getSession('sess-1', 'user-1', 'tenant-1');
      expect(result).toEqual(sampleSession);
    });

    it('returns null when session not found', async () => {
      mockSelectChain([]);
      const result = await service.getSession('missing', 'user-1', 'tenant-1');
      expect(result).toBeNull();
    });
  });

  describe('sendMessage()', () => {
    it('throws NotFoundException when session not found or not in progress', async () => {
      mockSelectChain([]); // session not found
      await expect(
        service.sendMessage('sess-missing', 'hello', 'user-1', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when template not found', async () => {
      mockSelectChain([sampleSession]); // session found
      mockSelectChain([]); // template not found
      await expect(
        service.sendMessage('sess-1', 'hello', 'user-1', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('returns true on success', async () => {
      mockSelectChain([sampleSession]);
      mockSelectChain([sampleTemplate]);
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.sendMessage(
        'sess-1',
        'Hello!',
        'user-1',
        'tenant-1'
      );
      expect(result).toBe(true);
    });
  });
});
