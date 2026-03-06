/**
 * ProctoringService unit tests — PRD §7.2 G-4 Remote Proctoring
 *
 * Verifies:
 * - startSession inserts row and returns mapped session
 * - startSession sets status=PENDING
 * - flagEvent appends flag to flags array
 * - flagEvent sets status=FLAGGED
 * - flagEvent returns updated session with flagCount incremented
 * - endSession sets status=COMPLETED, sets endedAt
 * - endSession throws NotFoundException for missing session
 * - getSession returns null for nonexistent session
 * - getReport returns all sessions for assessment
 * - onModuleDestroy calls closeAllPools()
 * - mapSession parses JSONB flags array correctly
 * - mapSession computes flagCount
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ── Shared mock state ─────────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  proctoring_sessions: {
    id: 'id',
    tenant_id: 'tenant_id',
    assessment_id: 'assessment_id',
    user_id: 'user_id',
    status: 'status',
    flags: 'flags',
    started_at: 'started_at',
    ended_at: 'ended_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ eq: [col, val] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

import { ProctoringService } from './proctoring.service';
import { closeAllPools } from '@edusphere/db';

// ── Helper builders ───────────────────────────────────────────────────────────

function makeRow(overrides: Partial<{
  id: string;
  assessment_id: string;
  user_id: string;
  tenant_id: string;
  status: string;
  started_at: Date | null;
  ended_at: Date | null;
  flags: unknown;
}> = {}) {
  return {
    id: 'sess-1',
    assessment_id: 'assess-1',
    user_id: 'user-1',
    tenant_id: 'tenant-1',
    status: 'PENDING',
    started_at: null,
    ended_at: null,
    flags: [],
    recording_key: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function buildService(): ProctoringService {
  return new ProctoringService();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProctoringService', () => {
  let service: ProctoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buildService();
  });

  // ── onModuleDestroy ────────────────────────────────────────────────────────

  it('calls closeAllPools on module destroy', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  // ── startSession ───────────────────────────────────────────────────────────

  it('startSession inserts row and returns mapped session', async () => {
    const row = makeRow();
    mockInsertReturning.mockResolvedValueOnce([row]);

    const result = await service.startSession('assess-1', 'tenant-1', 'user-1');

    expect(mockInsert).toHaveBeenCalled();
    expect(result.id).toBe('sess-1');
    expect(result.assessmentId).toBe('assess-1');
    expect(result.userId).toBe('user-1');
  });

  it('startSession sets status=PENDING', async () => {
    const row = makeRow({ status: 'PENDING' });
    mockInsertReturning.mockResolvedValueOnce([row]);

    const result = await service.startSession('assess-1', 'tenant-1', 'user-1');

    expect(result.status).toBe('PENDING');
  });

  it('startSession throws if insert returns empty array', async () => {
    mockInsertReturning.mockResolvedValueOnce([]);

    await expect(service.startSession('assess-1', 'tenant-1', 'user-1')).rejects.toThrow(
      'Failed to create proctoring session'
    );
  });

  // ── flagEvent ──────────────────────────────────────────────────────────────

  it('flagEvent appends flag to flags array', async () => {
    const existing = makeRow({ flags: [] });
    const updated = makeRow({ flags: [{ type: 'TAB_SWITCH', timestamp: '2026-01-01T00:00:00.000Z', detail: null }], status: 'FLAGGED' });

    mockSelectLimit.mockResolvedValueOnce([existing]);
    mockReturning.mockResolvedValueOnce([updated]);

    const result = await service.flagEvent('sess-1', 'TAB_SWITCH', null, 'tenant-1');

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0]?.type).toBe('TAB_SWITCH');
  });

  it('flagEvent sets status=FLAGGED', async () => {
    const existing = makeRow({ flags: [] });
    const updated = makeRow({ flags: [{ type: 'GAZE_AWAY', timestamp: '2026-01-01T00:00:00.000Z', detail: null }], status: 'FLAGGED' });

    mockSelectLimit.mockResolvedValueOnce([existing]);
    mockReturning.mockResolvedValueOnce([updated]);

    const result = await service.flagEvent('sess-1', 'GAZE_AWAY', null, 'tenant-1');

    expect(result.status).toBe('FLAGGED');
  });

  it('flagEvent returns updated session with flagCount incremented', async () => {
    const existingFlags = [{ type: 'TAB_SWITCH', timestamp: '2026-01-01T00:00:00.000Z', detail: null }];
    const existing = makeRow({ flags: existingFlags });
    const newFlags = [...existingFlags, { type: 'COPY_PASTE', timestamp: '2026-01-01T00:01:00.000Z', detail: 'ctrl+c' }];
    const updated = makeRow({ flags: newFlags, status: 'FLAGGED' });

    mockSelectLimit.mockResolvedValueOnce([existing]);
    mockReturning.mockResolvedValueOnce([updated]);

    const result = await service.flagEvent('sess-1', 'COPY_PASTE', 'ctrl+c', 'tenant-1');

    expect(result.flagCount).toBe(2);
  });

  it('flagEvent throws NotFoundException for missing session', async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    await expect(service.flagEvent('nonexistent', 'TAB_SWITCH', null, 'tenant-1')).rejects.toThrow(NotFoundException);
  });

  // ── endSession ─────────────────────────────────────────────────────────────

  it('endSession sets status=COMPLETED', async () => {
    const existing = makeRow({ status: 'ACTIVE' });
    const updated = makeRow({ status: 'COMPLETED', ended_at: new Date() });

    mockSelectLimit.mockResolvedValueOnce([existing]);
    mockReturning.mockResolvedValueOnce([updated]);

    const result = await service.endSession('sess-1', 'tenant-1');

    expect(result.status).toBe('COMPLETED');
  });

  it('endSession sets endedAt on the returned session', async () => {
    const endDate = new Date('2026-01-01T12:00:00.000Z');
    const existing = makeRow({ status: 'ACTIVE' });
    const updated = makeRow({ status: 'COMPLETED', ended_at: endDate });

    mockSelectLimit.mockResolvedValueOnce([existing]);
    mockReturning.mockResolvedValueOnce([updated]);

    const result = await service.endSession('sess-1', 'tenant-1');

    expect(result.endedAt).toBe(endDate.toISOString());
  });

  it('endSession throws NotFoundException for missing session (tenantId mismatch)', async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    await expect(service.endSession('nonexistent', 'wrong-tenant')).rejects.toThrow(NotFoundException);
  });

  // ── getSession ─────────────────────────────────────────────────────────────

  it('getSession returns null for nonexistent session', async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const result = await service.getSession('nonexistent', 'tenant-1');

    expect(result).toBeNull();
  });

  it('getSession returns mapped session when found', async () => {
    const row = makeRow();
    mockSelectLimit.mockResolvedValueOnce([row]);

    const result = await service.getSession('sess-1', 'tenant-1');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('sess-1');
  });

  // ── getReport ──────────────────────────────────────────────────────────────

  it('getReport returns all sessions for assessment', async () => {
    const rows = [makeRow({ id: 'sess-1' }), makeRow({ id: 'sess-2', user_id: 'user-2' })];
    // getReport uses select().from().where() without .limit()
    mockSelectWhere.mockResolvedValueOnce(rows);
    mockSelectFrom.mockReturnValueOnce({ where: mockSelectWhere });

    const result = await service.getReport('assess-1', 'tenant-1');

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('sess-1');
    expect(result[1]?.id).toBe('sess-2');
  });

  // ── mapSession (via public methods) ───────────────────────────────────────

  it('mapSession parses JSONB flags array correctly', async () => {
    const flags = [{ type: 'FACE_NOT_DETECTED', timestamp: '2026-01-01T00:00:00.000Z', detail: 'no face visible' }];
    const row = makeRow({ flags });
    mockSelectLimit.mockResolvedValueOnce([row]);

    const result = await service.getSession('sess-1', 'tenant-1');

    expect(result?.flags[0]?.type).toBe('FACE_NOT_DETECTED');
    expect(result?.flags[0]?.detail).toBe('no face visible');
  });

  it('mapSession computes flagCount correctly', async () => {
    const flags = [
      { type: 'TAB_SWITCH', timestamp: '2026-01-01T00:00:00.000Z', detail: null },
      { type: 'GAZE_AWAY', timestamp: '2026-01-01T00:01:00.000Z', detail: null },
      { type: 'MULTIPLE_FACES', timestamp: '2026-01-01T00:02:00.000Z', detail: null },
    ];
    const row = makeRow({ flags });
    mockSelectLimit.mockResolvedValueOnce([row]);

    const result = await service.getSession('sess-1', 'tenant-1');

    expect(result?.flagCount).toBe(3);
  });
});
