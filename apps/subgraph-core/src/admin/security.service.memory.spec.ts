/**
 * security.service.memory.spec.ts
 * Memory safety: SecurityService uses singleton db (no owned connections).
 * Verifies onModuleDestroy() is safe and idempotent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  db: {},
  securitySettings: {
    $inferSelect: {} as Record<string, unknown>,
  },
  eq: vi.fn(),
}));

import { SecurityService } from './security.service.js';

describe('SecurityService — memory safety', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('constructs without errors', () => {
    expect(() => new SecurityService()).not.toThrow();
  });

  it('onModuleDestroy() does not throw', () => {
    const svc = new SecurityService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', () => {
    const svc = new SecurityService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });
});
