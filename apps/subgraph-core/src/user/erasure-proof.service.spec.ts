import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @edusphere/db ──────────────────────────────────────────────────────
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
});

const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  }),
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
  })),
  schema: {
    gdprErasureLog: {
      userIdHash: 'user_id_hash',
      tenantId: 'tenant_id',
      requestedAt: 'requested_at',
      completedAt: 'completed_at',
      tablesAffected: 'tables_affected',
      rowsDeletedCount: 'rows_deleted_count',
      erasureHash: 'erasure_hash',
      verificationToken: 'verification_token',
      requestedBy: 'requested_by',
      status: 'status',
    },
  },
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { ErasureProofService } from './erasure-proof.service.js';
import type { ManifestEntry } from './erasure-proof.service.js';

describe('ErasureProofService', () => {
  let service: ErasureProofService;

  beforeEach(() => {
    service = new ErasureProofService();
    vi.clearAllMocks();
  });

  describe('hashUserId', () => {
    it('returns a 64-char hex SHA-256 hash', () => {
      const hash = service.hashUserId('user-123');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic — same input → same hash', () => {
      const h1 = service.hashUserId('user-abc');
      const h2 = service.hashUserId('user-abc');
      expect(h1).toBe(h2);
    });

    it('different users produce different hashes', () => {
      const h1 = service.hashUserId('user-1');
      const h2 = service.hashUserId('user-2');
      expect(h1).not.toBe(h2);
    });
  });

  describe('buildManifest', () => {
    it('builds a manifest with correct fields', () => {
      const entries: ManifestEntry[] = [
        { table: 'ANNOTATIONS', rowsDeleted: 5 },
        { table: 'USER_RECORD', rowsDeleted: 1 },
      ];
      const manifest = service.buildManifest(
        'user-1',
        'tenant-1',
        'admin-1',
        entries
      );

      expect(manifest.userId).toBe(service.hashUserId('user-1'));
      expect(manifest.tenantId).toBe('tenant-1');
      expect(manifest.requestedBy).toBe('admin-1');
      expect(manifest.entries).toHaveLength(2);
      expect(manifest.totalRowsDeleted).toBe(6);
      expect(manifest.requestedAt).toBeDefined();
      expect(manifest.completedAt).toBeDefined();
    });
  });

  describe('hashManifest', () => {
    it('returns a 64-char hex SHA-256 hash', () => {
      const entries: ManifestEntry[] = [{ table: 'USERS', rowsDeleted: 1 }];
      const manifest = service.buildManifest('u1', 't1', 'admin', entries);
      const hash = service.hashManifest(manifest);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic for the same manifest', () => {
      const manifest = service.buildManifest('u1', 't1', 'admin', [
        { table: 'X', rowsDeleted: 1 },
      ]);
      expect(service.hashManifest(manifest)).toBe(
        service.hashManifest(manifest)
      );
    });
  });

  describe('signHash + verifyToken', () => {
    it('signHash returns a 64-char hex HMAC', () => {
      const sig = service.signHash('test-hash');
      expect(sig).toHaveLength(64);
      expect(sig).toMatch(/^[0-9a-f]{64}$/);
    });

    it('createVerificationToken produces a valid base64 token', () => {
      const manifest = service.buildManifest('u1', 't1', 'admin', [
        { table: 'USERS', rowsDeleted: 1 },
      ]);
      const hash = service.hashManifest(manifest);
      const token = service.createVerificationToken(manifest, hash);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('verifyToken returns true for a valid token', () => {
      const manifest = service.buildManifest('u1', 't1', 'admin', [
        { table: 'USERS', rowsDeleted: 1 },
      ]);
      const hash = service.hashManifest(manifest);
      const token = service.createVerificationToken(manifest, hash);

      expect(service.verifyToken(token)).toBe(true);
    });

    it('verifyToken returns false for a tampered token', () => {
      const manifest = service.buildManifest('u1', 't1', 'admin', [
        { table: 'USERS', rowsDeleted: 1 },
      ]);
      const hash = service.hashManifest(manifest);
      const token = service.createVerificationToken(manifest, hash);

      // Tamper with the token
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const tampered = decoded.replace('"totalRows":1', '"totalRows":999');
      const tamperedToken = Buffer.from(tampered).toString('base64');

      expect(service.verifyToken(tamperedToken)).toBe(false);
    });

    it('verifyToken returns false for garbage input', () => {
      expect(service.verifyToken('not-a-valid-token')).toBe(false);
    });
  });

  describe('generateAndStore', () => {
    it('inserts a record into gdprErasureLog', async () => {
      const entries: ManifestEntry[] = [
        { table: 'ANNOTATIONS', rowsDeleted: 3 },
        { table: 'USER_RECORD', rowsDeleted: 1 },
      ];

      const proof = await service.generateAndStore(
        'user-1',
        'tenant-1',
        'admin-1',
        entries
      );

      expect(mockInsert).toHaveBeenCalled();
      expect(proof.manifestHash).toHaveLength(64);
      expect(proof.signature).toHaveLength(64);
      expect(proof.verificationToken).toBeDefined();
      expect(proof.manifest.totalRowsDeleted).toBe(4);
      expect(proof.manifest.entries).toHaveLength(2);
    });

    it('proof verification token is valid', async () => {
      const proof = await service.generateAndStore(
        'user-1',
        'tenant-1',
        'admin-1',
        [{ table: 'USERS', rowsDeleted: 1 }]
      );
      expect(service.verifyToken(proof.verificationToken)).toBe(true);
    });
  });

  describe('verifyErasure', () => {
    it('returns null when no erasure log found', async () => {
      const result = await service.verifyErasure('nonexistent-user');
      expect(result).toBeNull();
    });

    it('returns verification data when log exists', async () => {
      // Build a valid token for the mock row
      const manifest = service.buildManifest('user-1', 't1', 'admin', [
        { table: 'USERS', rowsDeleted: 1 },
      ]);
      const hash = service.hashManifest(manifest);
      const token = service.createVerificationToken(manifest, hash);

      const mockRow = {
        userIdHash: service.hashUserId('user-1'),
        tenantId: 'tenant-1',
        requestedAt: new Date('2026-01-01'),
        completedAt: new Date('2026-01-01'),
        tablesAffected: ['USERS'],
        rowsDeletedCount: 1,
        erasureHash: hash,
        verificationToken: token,
        status: 'COMPLETED',
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRow]),
          }),
        }),
      });

      const result = await service.verifyErasure('user-1');

      expect(result).not.toBeNull();
      expect(result?.isValid).toBe(true);
      expect(result?.erasureHash).toBe(hash);
      expect(result?.status).toBe('COMPLETED');
      expect(result?.tablesAffected).toEqual(['USERS']);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
