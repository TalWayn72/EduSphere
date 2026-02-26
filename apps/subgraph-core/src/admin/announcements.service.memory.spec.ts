/**
 * announcements.service.memory.spec.ts
 * Memory safety: AnnouncementsService uses singleton db (no owned connections).
 * Verifies onModuleDestroy() is safe and idempotent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  db: {},
  announcements: {},
  count: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  lte: vi.fn(),
  gte: vi.fn(),
  desc: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
  sql: vi.fn(),
}));

import { AnnouncementsService } from './announcements.service.js';

describe('AnnouncementsService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs without errors', () => {
    expect(() => new AnnouncementsService()).not.toThrow();
  });

  it('onModuleDestroy() does not throw', () => {
    const svc = new AnnouncementsService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });

  it('onModuleDestroy() is idempotent — safe to call multiple times', () => {
    const svc = new AnnouncementsService();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });
});
