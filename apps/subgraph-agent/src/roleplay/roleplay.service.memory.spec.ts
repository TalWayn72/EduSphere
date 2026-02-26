/**
 * Memory safety tests — F-007 RoleplayService + RoleplaySessionService.
 * Verifies OnModuleDestroy calls closeAllPools (no DB pool leak).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(() => Promise.resolve()),
  scenario_templates: {},
  scenario_sessions: {},
}));

vi.mock('../ai/roleplay.workflow.js', () => ({
  createRoleplayWorkflow: vi.fn(),
}));

vi.mock('./scenario-seeds.js', () => ({
  BUILT_IN_SCENARIOS: [],
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(),
  eq: vi.fn(),
}));

import { RoleplayService } from './roleplay.service';
import { closeAllPools } from '@edusphere/db';

const _mockConsentGuard = { assertConsent: vi.fn() };

describe('RoleplayService memory safety', () => {
  let service: RoleplayService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RoleplayService();
  });

  it('calls closeAllPools on module destroy to prevent DB pool leak', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('can be destroyed multiple times without error', async () => {
    await service.onModuleDestroy();
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(2);
  });
});
