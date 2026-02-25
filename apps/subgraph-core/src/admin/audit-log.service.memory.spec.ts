/**
 * audit-log.service.memory.spec.ts
 * Memory safety: AuditLogService uses singleton db (no owned connections).
 * Verifies onModuleDestroy() is safe and idempotent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  db: {},
  auditLog: {},
  count: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  and: vi.fn(),
  eq: vi.fn(),
  like: vi.fn(),
}));

import { AuditLogService } from './audit-log.service.js';

describe('AuditLogService — memory safety', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('constructs without errors', () => {
    expect(() => new AuditLogService()).not.toThrow();
  });

  it('onModuleDestroy() does not throw', () => {
    const svc = new AuditLogService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', () => {
    const svc = new AuditLogService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });
});
