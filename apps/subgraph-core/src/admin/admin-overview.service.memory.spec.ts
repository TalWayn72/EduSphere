/**
 * admin-overview.service.memory.spec.ts
 * Memory safety: AdminOverviewService uses singleton db (no owned connections).
 * Verifies onModuleDestroy() is safe and idempotent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  db: {},
  users: {},
  scimSyncLog: {},
  count: vi.fn(),
  gte: vi.fn(),
  eq: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
}));

import { AdminOverviewService } from './admin-overview.service.js';

describe('AdminOverviewService — memory safety', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('constructs without errors', () => {
    expect(() => new AdminOverviewService()).not.toThrow();
  });

  it('onModuleDestroy() does not throw', () => {
    const svc = new AdminOverviewService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', () => {
    const svc = new AdminOverviewService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });
});
