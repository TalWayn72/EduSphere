/**
 * pilot.service.spec.ts — Unit tests for PilotService.
 * Verifies: submitPilotRequest Zod validation, duplicate detection,
 * approvePilotRequest role guard, rejectPilotRequest happy path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockReturning = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.orderBy = self;
  p.leftJoin = self;
  p.returning = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: vi.fn(),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn({ insert: mockInsert, select: mockSelect })),
  schema: {
    pilotRequests: {
      id: 'id',
      contactEmail: 'contactEmail',
      status: 'status',
      created_at: 'created_at',
    },
    tenants: { id: 'id', name: 'name', slug: 'slug', plan: 'plan' },
    subscriptionPlans: { id: 'id', isActive: 'isActive' },
    tenantSubscriptions: { id: 'id' },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    isClosed: vi.fn(() => false),
    drain: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
  }),
}));

import { PilotService } from './pilot.service.js';

const SUPER_CTX = {
  tenantId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  userId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  userRole: 'SUPER_ADMIN' as const,
};

const VALID_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440001';

const VALID_INPUT = {
  orgName: 'Acme University',
  orgType: 'UNIVERSITY',
  contactName: 'Jane Doe',
  contactEmail: 'jane@acme.edu',
  estimatedUsers: 500,
  useCase: 'We need an LMS for our engineering department training needs.',
};

describe('PilotService', () => {
  let service: PilotService;

  const makeSubSvc = () =>
    ({
      createPilotSubscription: vi.fn().mockResolvedValue({ id: 'sub-1' }),
    }) as unknown as import('./subscription.service.js').SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PilotService(makeSubSvc());
  });

  it('constructs without throwing', () => {
    expect(service).toBeDefined();
  });

  it('onModuleDestroy does not throw', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  // ── submitPilotRequest — Zod validation ──────────────────────────────────

  it('submitPilotRequest throws BadRequestException on invalid input', async () => {
    await expect(
      service.submitPilotRequest({ orgName: '', orgType: 'INVALID' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submitPilotRequest throws BadRequestException when useCase too short', async () => {
    await expect(
      service.submitPilotRequest({ ...VALID_INPUT, useCase: 'short' })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submitPilotRequest silently succeeds on duplicate pending email (SC-05 anti-enumeration)', async () => {
    // SC-05: duplicate emails must NOT reveal the duplicate — return existing record silently
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'existing-1' }]));
    const result = await service.submitPilotRequest(VALID_INPUT);
    // Returns the existing record without revealing it was a duplicate
    expect(result).toBeDefined();
    expect(result.id).toBe('existing-1');
  });

  it('submitPilotRequest inserts and returns new pilot request', async () => {
    // No duplicate found
    mockSelect.mockReturnValueOnce(makeChain([]));
    const newRow = { ...VALID_INPUT, id: 'req-1', status: 'pending', orgType: 'university', created_at: new Date() };
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newRow]),
      }),
    });

    const result = await service.submitPilotRequest(VALID_INPUT);
    expect(result).toHaveProperty('id', 'req-1');
    expect(result).toHaveProperty('status', 'pending');
  });

  // ── approvePilotRequest — role guard ─────────────────────────────────────

  it('approvePilotRequest throws UnauthorizedException for non-SUPER_ADMIN', async () => {
    const orgAdminCtx = { ...SUPER_CTX, userRole: 'ORG_ADMIN' as const };
    await expect(
      service.approvePilotRequest('req-1', 'admin-1', orgAdminCtx)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('approvePilotRequest throws NotFoundException for unknown request', async () => {
    mockSelect.mockReturnValueOnce(makeChain([])); // not found
    await expect(
      service.approvePilotRequest('req-unknown', 'admin-1', SUPER_CTX)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('approvePilotRequest throws BadRequestException when already approved', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'req-1', status: 'approved', orgName: 'Acme' }]));
    await expect(
      service.approvePilotRequest('req-1', 'admin-1', SUPER_CTX)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── rejectPilotRequest — role guard ──────────────────────────────────────

  it('rejectPilotRequest throws UnauthorizedException for non-SUPER_ADMIN', async () => {
    const studentCtx = { ...SUPER_CTX, userRole: 'STUDENT' as const };
    await expect(
      service.rejectPilotRequest(VALID_REQUEST_ID, 'not a fit', studentCtx)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejectPilotRequest succeeds for SUPER_ADMIN with pending request', async () => {
    mockSelect.mockReturnValueOnce(
      makeChain([{ id: VALID_REQUEST_ID, status: 'pending' }])
    );
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    await expect(
      service.rejectPilotRequest(VALID_REQUEST_ID, 'Not a fit', SUPER_CTX)
    ).resolves.toBeUndefined();
  });

  // ── listPilotRequests ────────────────────────────────────────────────────

  it('listPilotRequests returns all rows when no status filter', async () => {
    const rows = [
      { id: 'r1', status: 'pending' },
      { id: 'r2', status: 'approved' },
    ];
    // Use mockReturnValue (not Once) so async NATS init doesn't consume the mock
    mockSelect.mockReturnValue(makeChain(rows));
    const result = await service.listPilotRequests();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('listPilotRequests with status filter calls select', async () => {
    const rows = [{ id: 'r1', status: 'pending' }];
    mockSelect.mockReturnValue(makeChain(rows));
    const result = await service.listPilotRequests('pending');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
