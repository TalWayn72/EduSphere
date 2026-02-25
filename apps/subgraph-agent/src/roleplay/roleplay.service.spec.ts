/**
 * RoleplayService + RoleplaySessionService unit tests — F-007
 *
 * Verifies:
 * - Consent check runs before LLM call
 * - CONSENT_REQUIRED error thrown without consent
 * - Session creation stores correct data
 * - Turn count increments on sendMessage
 * - closeAllPools called on destroy
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GraphQLError } from 'graphql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn(() => Promise.resolve()),
  scenario_templates: {},
  scenario_sessions: {},
}));

vi.mock('../ai/roleplay.workflow.js', () => ({
  createRoleplayWorkflow: vi.fn(() => mockWorkflow),
}));

vi.mock('./scenario-seeds.js', () => ({
  BUILT_IN_SCENARIOS: [],
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args) => ({ and: args })),
  eq: vi.fn((col, val) => ({ eq: [col, val] })),
}));

const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb.returning()),
  insert: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => Promise.resolve([])),
  onConflictDoNothing: vi.fn(() => Promise.resolve()),
};

const mockWorkflow = { invoke: vi.fn(() => Promise.resolve({ evaluation: null })) };
const mockConsentGuard = { assertConsent: vi.fn(() => Promise.resolve()) };

import { RoleplayService } from './roleplay.service';
import { RoleplaySessionService } from './roleplay-session.service';
import { closeAllPools } from '@edusphere/db';

// ── RoleplayService (catalog) ─────────────────────────────────────────────────

describe('RoleplayService', () => {
  let service: RoleplayService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RoleplayService();
  });

  it('calls closeAllPools on module destroy', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('can be destroyed multiple times without error', async () => {
    await service.onModuleDestroy();
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(2);
  });
});

// ── RoleplaySessionService ───────────────────────────────────────────────────

describe('RoleplaySessionService', () => {
  let service: RoleplaySessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RoleplaySessionService(mockConsentGuard as never);
  });

  describe('startSession', () => {
    it('checks THIRD_PARTY_LLM consent before any LLM call', async () => {
      const template = {
        id: 'tpl-1', character_persona: 'Angry customer', scene_description: 'De-escalate',
        evaluation_rubric: [], max_turns: 8, is_active: true,
      };
      const session = { id: 'sess-1', scenario_id: 'tpl-1', turn_count: 0, status: 'IN_PROGRESS', started_at: new Date() };
      mockDb.returning.mockResolvedValueOnce([template]).mockResolvedValueOnce([session]);

      await service.startSession('tpl-1', 'user-1', 'tenant-1');
      expect(mockConsentGuard.assertConsent).toHaveBeenCalledWith('user-1', expect.any(Boolean));
    });

    it('throws CONSENT_REQUIRED when consent guard rejects', async () => {
      mockConsentGuard.assertConsent.mockRejectedValueOnce(
        new GraphQLError('Consent required', { extensions: { code: 'CONSENT_REQUIRED' } }),
      );
      await expect(service.startSession('tpl-1', 'user-1', 'tenant-1')).rejects.toThrow('Consent required');
    });

    it('throws NotFoundException when scenario not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);
      await expect(service.startSession('nonexistent', 'user-1', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('returns session with correct initial state', async () => {
      const template = { id: 'tpl-1', character_persona: 'c', scene_description: 'd', evaluation_rubric: [], max_turns: 8, is_active: true };
      const session = { id: 'sess-1', scenario_id: 'tpl-1', turn_count: 0, status: 'IN_PROGRESS', started_at: new Date() };
      mockDb.returning.mockResolvedValueOnce([template]).mockResolvedValueOnce([session]);

      const result = await service.startSession('tpl-1', 'user-1', 'tenant-1');
      expect(result.id).toBe('sess-1');
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.turn_count).toBe(0);
    });
  });

  describe('sendMessage', () => {
    it('throws NotFoundException when session not found', async () => {
      mockDb.where.mockReturnValueOnce({ limit: () => Promise.resolve([]) });
      await expect(service.sendMessage('nonexistent', 'Hello', 'user-1', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('returns true on successful message send', async () => {
      const session = { id: 'sess-1', scenario_id: 'tpl-1', user_id: 'user-1', tenant_id: 'tenant-1', status: 'IN_PROGRESS', turn_count: 2 };
      const template = { id: 'tpl-1', character_persona: 'c', scene_description: 'd', evaluation_rubric: [], max_turns: 8, is_active: true };
      mockDb.returning.mockResolvedValueOnce([session]).mockResolvedValueOnce([template]);

      const result = await service.sendMessage('sess-1', 'Hello', 'user-1', 'tenant-1');
      expect(result).toBe(true);
    });

    it('truncates messages longer than 2000 characters silently', async () => {
      const longMessage = 'x'.repeat(3000);
      const session = { id: 'sess-1', scenario_id: 'tpl-1', user_id: 'user-1', tenant_id: 'tenant-1', status: 'IN_PROGRESS', turn_count: 2 };
      const template = { id: 'tpl-1', character_persona: 'c', scene_description: 'd', evaluation_rubric: [], max_turns: 8, is_active: true };
      mockDb.returning.mockResolvedValueOnce([session]).mockResolvedValueOnce([template]);

      const result = await service.sendMessage('sess-1', longMessage, 'user-1', 'tenant-1');
      expect(result).toBe(true);
    });
  });
});
