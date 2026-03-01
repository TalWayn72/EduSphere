/**
 * announcements.service.spec.ts — Unit tests for AnnouncementsService.
 * Covers: mapRow helper, DB delegation, CRUD operations, error fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@edusphere/db', () => ({
  db: mockDb,
  announcements: {
    id: {},
    tenantId: {},
    title: {},
    body: {},
    priority: {},
    targetAudience: {},
    isActive: {},
    publishAt: {},
    expiresAt: {},
    createdBy: {},
    createdAt: {},
  },
  count: vi.fn(() => 'COUNT(*)'),
  eq: vi.fn(),
  and: vi.fn(),
  lte: vi.fn(),
  gte: vi.fn(),
  desc: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { AnnouncementsService } from './announcements.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = new Date('2026-01-15T10:00:00Z');
const PUB_AT = new Date('2026-01-10T00:00:00Z');

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'ann-1',
  title: 'Hello',
  body: 'World',
  priority: 'NORMAL',
  targetAudience: 'ALL',
  isActive: true,
  publishAt: PUB_AT,
  expiresAt: null,
  createdBy: 'user-1',
  createdAt: NOW,
  tenantId: 'tenant-1',
  updatedAt: NOW,
  ...overrides,
});

/** Builds a chainable mock chain that resolves at a named terminal method. */
function selectChain(rows: unknown[]) {
  const end = () => Promise.resolve(rows);
  const inner: Record<string, unknown> = {
    orderBy: () => ({
      limit: () => ({ offset: end }),
      then: (_r: (v: unknown[]) => unknown) => Promise.resolve(rows).then(_r),
    }),
    where: () => ({
      orderBy: () => ({
        limit: () => ({ offset: end }),
        then: (_r: (v: unknown[]) => unknown) => Promise.resolve(rows).then(_r),
      }),
      then: (_r: (v: unknown[]) => unknown) => Promise.resolve(rows).then(_r),
    }),
    then: (_r: (v: unknown[]) => unknown) => Promise.resolve(rows).then(_r),
  };
  return { from: () => inner };
}

function insertChain(rows: unknown[]) {
  return {
    values: () => ({
      returning: () => Promise.resolve(rows),
    }),
  };
}

function updateChain(rows: unknown[]) {
  return {
    set: () => ({
      where: () => ({
        returning: () => Promise.resolve(rows),
      }),
    }),
  };
}

function deleteChain() {
  return { where: () => Promise.resolve(undefined) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnnouncementsService();
  });

  // 1. onModuleDestroy is a no-op
  it('onModuleDestroy does not throw', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });

  // 2. mapRow handles nulls for publishAt, expiresAt, createdBy
  it('mapRow maps null optional fields to null', async () => {
    const row = makeRow({ publishAt: null, expiresAt: null, createdBy: null });
    mockDb.select
      .mockReturnValueOnce(selectChain([row]))    // rows
      .mockReturnValueOnce(selectChain([{ value: 1 }])); // count
    const result = await service.getAdminAnnouncements('tenant-1', { limit: 10, offset: 0 });
    expect(result.announcements[0]?.publishAt).toBeNull();
    expect(result.announcements[0]?.expiresAt).toBeNull();
    expect(result.announcements[0]?.createdBy).toBeNull();
  });

  // 3. mapRow formats ISO dates for publishAt/expiresAt/createdAt
  it('mapRow formats Date objects as ISO strings', async () => {
    const row = makeRow({ publishAt: PUB_AT, expiresAt: new Date('2026-03-01T00:00:00Z') });
    mockDb.select
      .mockReturnValueOnce(selectChain([row]))
      .mockReturnValueOnce(selectChain([{ value: 1 }]));
    const result = await service.getAdminAnnouncements('tenant-1', { limit: 10, offset: 0 });
    const ann = result.announcements[0]!;
    expect(ann.publishAt).toBe(PUB_AT.toISOString());
    expect(ann.createdAt).toBe(NOW.toISOString());
  });

  // 4. getAdminAnnouncements delegates to DB and returns shaped result
  it('getAdminAnnouncements returns total and announcements array', async () => {
    mockDb.select
      .mockReturnValueOnce(selectChain([makeRow(), makeRow({ id: 'ann-2', title: 'Hi' })]))
      .mockReturnValueOnce(selectChain([{ value: 2 }]));
    const result = await service.getAdminAnnouncements('tenant-1', { limit: 10, offset: 0 });
    expect(result.total).toBe(2);
    expect(result.announcements).toHaveLength(2);
  });

  // 5. getAdminAnnouncements returns empty result on DB error
  it('getAdminAnnouncements returns empty result on DB error', async () => {
    mockDb.select.mockImplementation(() => { throw new Error('DB error'); });
    const result = await service.getAdminAnnouncements('tenant-1', { limit: 10, offset: 0 });
    expect(result.announcements).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // 6. create inserts and returns mapped data
  it('create inserts into DB and returns mapped announcement', async () => {
    mockDb.insert.mockReturnValue(insertChain([makeRow()]));
    const result = await service.create('tenant-1', 'user-1', {
      title: 'Hello',
      body: 'World',
      priority: 'NORMAL',
      targetAudience: 'ALL',
    });
    expect(result.id).toBe('ann-1');
    expect(result.title).toBe('Hello');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  // 7. update patches row and returns mapped result
  it('update calls DB update and returns mapped announcement', async () => {
    const updated = makeRow({ title: 'Updated Title' });
    mockDb.update.mockReturnValue(updateChain([updated]));
    const result = await service.update('ann-1', { title: 'Updated Title' });
    expect(result.title).toBe('Updated Title');
    expect(mockDb.update).toHaveBeenCalled();
  });

  // 8. delete calls DB delete and returns true
  it('delete calls DB delete and returns true', async () => {
    mockDb.delete.mockReturnValue(deleteChain());
    const result = await service.delete('ann-1');
    expect(result).toBe(true);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
