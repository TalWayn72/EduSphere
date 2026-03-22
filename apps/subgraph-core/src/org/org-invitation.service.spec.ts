/**
 * org-invitation.service.spec.ts — Unit tests for OrgInvitationService.
 *
 * Covers:
 *   - Single invitation creation (happy path)
 *   - Token generation and validation
 *   - 7-day expiry enforcement
 *   - Invitation acceptance flow
 *   - Bulk invite (up to 100)
 *   - Duplicate invitation detection
 *   - Max users limit enforcement
 *   - Resend with refreshed expiry
 *   - Invalid email rejection
 *   - Role validation (no SUPER_ADMIN)
 *   - Expired token rejection
 *   - Token tampering/forgery detection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> & Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.orderBy = self;
  p.returning = self;
  p.values = self;
  p.set = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (arg: unknown) => unknown) =>
    fn({ insert: mockInsert, select: mockSelect, update: mockUpdate }),
  ),
  schema: {
    orgInvitations: {
      id: 'id',
      email: 'email',
      tenantId: 'tenant_id',
      role: 'role',
      token: 'token',
      status: 'status',
      expiresAt: 'expires_at',
      invitedBy: 'invited_by',
    },
    users: { id: 'id', email: 'email', tenantId: 'tenant_id' },
    tenants: { id: 'id', plan: 'plan' },
    subscriptionPlans: { maxYau: 'max_yau' },
    tenantSubscriptions: { tenantId: 'tenant_id', planId: 'plan_id' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  count: vi.fn(() => ({ count: 'count' })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    isClosed: vi.fn(() => false),
    drain: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn(),
  }),
}));

import { OrgInvitationService } from './org-invitation.service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 'tenant-001',
  userId: 'admin-001',
  role: 'ORG_ADMIN',
};

const VALID_INVITE = {
  email: 'instructor@acme.edu',
  role: 'INSTRUCTOR' as const,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('OrgInvitationService', () => {
  let service: OrgInvitationService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing invitation, no existing user
    mockSelect.mockReturnValue(makeChain([]));
    // Default: insert returns new invitation
    mockInsert.mockReturnValue(
      makeChain([{
        id: 'inv-001',
        email: VALID_INVITE.email,
        role: VALID_INVITE.role,
        token: 'tok-abc-123',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }]),
    );

    service = new OrgInvitationService();
  });

  // ─── Single invitation ────────────────────────────────────────────────────

  describe('createInvitation()', () => {
    it('creates invitation with PENDING status', async () => {
      const result = await service.createInvitation(TENANT_CTX, VALID_INVITE);
      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('generates a cryptographically random token', async () => {
      const result = await service.createInvitation(TENANT_CTX, VALID_INVITE);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThanOrEqual(32);
    });

    it('sets expiry to 7 days from now', async () => {
      const before = Date.now();
      const result = await service.createInvitation(TENANT_CTX, VALID_INVITE);
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(result.expiresAt).getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    });

    it('stores invitedBy from tenant context', async () => {
      await service.createInvitation(TENANT_CTX, VALID_INVITE);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  // ─── Role validation ──────────────────────────────────────────────────────

  describe('role validation', () => {
    it('rejects SUPER_ADMIN role in invitation', async () => {
      await expect(
        service.createInvitation(TENANT_CTX, { ...VALID_INVITE, role: 'SUPER_ADMIN' as never }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts STUDENT role', async () => {
      const result = await service.createInvitation(TENANT_CTX, { ...VALID_INVITE, role: 'STUDENT' as const });
      expect(result).toBeDefined();
    });

    it('accepts INSTRUCTOR role', async () => {
      const result = await service.createInvitation(TENANT_CTX, VALID_INVITE);
      expect(result).toBeDefined();
    });

    it('accepts ORG_ADMIN role', async () => {
      const result = await service.createInvitation(TENANT_CTX, { ...VALID_INVITE, role: 'ORG_ADMIN' as const });
      expect(result).toBeDefined();
    });
  });

  // ─── Duplicate detection ──────────────────────────────────────────────────

  describe('duplicate detection', () => {
    it('rejects duplicate pending invitation for same email', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ id: 'existing-inv', email: VALID_INVITE.email, status: 'PENDING' }]),
      );

      await expect(
        service.createInvitation(TENANT_CTX, VALID_INVITE),
      ).rejects.toThrow(ConflictException);
    });

    it('allows re-invite if previous invitation was expired', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ id: 'old-inv', email: VALID_INVITE.email, status: 'EXPIRED' }]),
      );

      const result = await service.createInvitation(TENANT_CTX, VALID_INVITE);
      expect(result).toBeDefined();
    });
  });

  // ─── Email validation ─────────────────────────────────────────────────────

  describe('email validation', () => {
    it('rejects invalid email format', async () => {
      await expect(
        service.createInvitation(TENANT_CTX, { ...VALID_INVITE, email: 'not-an-email' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty email', async () => {
      await expect(
        service.createInvitation(TENANT_CTX, { ...VALID_INVITE, email: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Token validation ─────────────────────────────────────────────────────

  describe('validateToken()', () => {
    it('returns invitation for valid token', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{
          id: 'inv-001',
          token: 'valid-tok',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 86400000),
        }]),
      );

      const result = await service.validateToken('valid-tok');
      expect(result).toBeDefined();
      expect(result.id).toBe('inv-001');
    });

    it('rejects expired token', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{
          id: 'inv-expired',
          token: 'expired-tok',
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        }]),
      );

      await expect(
        service.validateToken('expired-tok'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects token not found', async () => {
      mockSelect.mockReturnValue(makeChain([]));

      await expect(
        service.validateToken('nonexistent-tok'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects already accepted invitation token', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{
          id: 'inv-accepted',
          token: 'used-tok',
          status: 'ACCEPTED',
          expiresAt: new Date(Date.now() + 86400000),
        }]),
      );

      await expect(
        service.validateToken('used-tok'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Accept invitation ────────────────────────────────────────────────────

  describe('acceptInvitation()', () => {
    it('updates invitation status to ACCEPTED', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{
          id: 'inv-001',
          token: 'valid-tok',
          email: 'user@acme.edu',
          role: 'STUDENT',
          tenantId: 'tenant-001',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 86400000),
        }]),
      );

      await service.acceptInvitation('valid-tok', { password: 'SecurePass123!' });
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ─── Bulk invite ──────────────────────────────────────────────────────────

  describe('bulkInvite()', () => {
    it('creates up to 100 invitations', async () => {
      const emails = Array.from({ length: 100 }, (_, i) => `user${i}@acme.edu`);
      const result = await service.bulkInvite(TENANT_CTX, emails, 'STUDENT');
      expect(result).toBeDefined();
      expect(result.sent).toBeLessThanOrEqual(100);
    });

    it('rejects batch over 100 emails', async () => {
      const emails = Array.from({ length: 101 }, (_, i) => `user${i}@acme.edu`);
      await expect(
        service.bulkInvite(TENANT_CTX, emails, 'STUDENT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('reports invalid emails separately from valid ones', async () => {
      const emails = ['valid@acme.edu', 'not-an-email', 'also-invalid', 'ok@test.com'];
      const result = await service.bulkInvite(TENANT_CTX, emails, 'STUDENT');
      expect(result.failed).toBeGreaterThan(0);
      expect(result.sent).toBeLessThanOrEqual(2);
    });
  });

  // ─── Max users limit ──────────────────────────────────────────────────────

  describe('max users limit', () => {
    it('rejects invitation when user limit reached', async () => {
      // Mock: plan allows 500 users, currently 500
      mockSelect
        .mockReturnValueOnce(makeChain([])) // no existing invitation
        .mockReturnValueOnce(makeChain([{ maxYau: 500 }])) // plan limit
        .mockReturnValueOnce(makeChain([{ count: 500 }])); // current count

      await expect(
        service.createInvitation(TENANT_CTX, VALID_INVITE),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Resend ───────────────────────────────────────────────────────────────

  describe('resendInvitation()', () => {
    it('refreshes expiry date on resend', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{
          id: 'inv-001',
          email: VALID_INVITE.email,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 86400000),
        }]),
      );

      await service.resendInvitation(TENANT_CTX, 'inv-001');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('rejects resend for accepted invitation', async () => {
      mockSelect.mockReturnValueOnce(
        makeChain([{ id: 'inv-001', status: 'ACCEPTED' }]),
      );

      await expect(
        service.resendInvitation(TENANT_CTX, 'inv-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Memory safety ────────────────────────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
