/**
 * Unit tests for GraphGroundedCredentialService (GAP-8)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { GraphGroundedCredentialService } from './graph-credential.service.js';
import * as db from '@edusphere/db';

vi.mock('@edusphere/db', async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    createDatabaseConnection: vi.fn(),
    withTenantContext: vi.fn(),
    closeAllPools: vi.fn(),
  };
});

const mockWithTenantContext = db.withTenantContext as MockedFunction<
  typeof db.withTenantContext
>;
const mockCreateDb = db.createDatabaseConnection as MockedFunction<
  typeof db.createDatabaseConnection
>;

describe('GraphGroundedCredentialService', () => {
  let service: GraphGroundedCredentialService;

  beforeEach(() => {
    mockCreateDb.mockReturnValue({} as ReturnType<typeof db.createDatabaseConnection>);
    service = new GraphGroundedCredentialService();
  });

  it('returns covered=true when enrollment status is COMPLETED', async () => {
    const requiredConcepts = ['c1', 'c2', 'c3', 'c4'];

    mockWithTenantContext.mockImplementation(async (_db, _ctx, operation) => {
      const fakeTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ status: 'COMPLETED', completedAt: new Date() }]),
      } as unknown as db.DrizzleDB;
      return operation(fakeTx);
    });

    const result = await service.verifyKnowledgePathCoverage(
      'user-1',
      'tenant-1',
      'course-1',
      requiredConcepts,
    );

    expect(result.covered).toBe(true);
    expect(result.coverageScore).toBe(1.0);
    expect(result.conceptIds).toEqual(requiredConcepts);
    expect(result.missingConcepts).toHaveLength(0);
    expect(result.pathDepth).toBe(4);
  });

  it('returns covered=false when no enrollment found', async () => {
    const requiredConcepts = ['c1', 'c2'];

    mockWithTenantContext.mockImplementation(async (_db, _ctx, operation) => {
      const fakeTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as unknown as db.DrizzleDB;
      return operation(fakeTx);
    });

    const result = await service.verifyKnowledgePathCoverage(
      'user-x',
      'tenant-x',
      'course-x',
      requiredConcepts,
    );

    expect(result.covered).toBe(false);
    expect(result.coverageScore).toBe(0);
    expect(result.conceptIds).toHaveLength(0);
    expect(result.missingConcepts).toEqual(requiredConcepts);
  });

  it('returns covered=false when enrollment is ACTIVE (coverage 0.5 < 0.7 threshold)', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, operation) => {
      const fakeTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ status: 'ACTIVE', completedAt: null }]),
      } as unknown as db.DrizzleDB;
      return operation(fakeTx);
    });

    const result = await service.verifyKnowledgePathCoverage(
      'user-2',
      'tenant-2',
      'course-2',
      ['c1', 'c2', 'c3', 'c4'],
    );

    expect(result.covered).toBe(false);
    expect(result.coverageScore).toBe(0.5);
  });

  it('records graph credential and returns credentialId', async () => {
    const coverage = {
      covered: true,
      coverageScore: 1.0,
      conceptIds: ['c1', 'c2'],
      pathDepth: 2,
      missingConcepts: [],
    };

    mockWithTenantContext.mockImplementation(async (_db, _ctx, operation) => {
      const fakeTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'cred-uuid-1' }]),
      } as unknown as db.DrizzleDB;
      return operation(fakeTx);
    });

    const result = await service.recordGraphCredential(
      'user-1',
      'tenant-1',
      'assertion-1',
      coverage,
    );

    expect(result.credentialId).toBe('cred-uuid-1');
  });

  it('cleans up on module destroy', async () => {
    const mockClose = vi.mocked(db.closeAllPools).mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(mockClose).toHaveBeenCalled();
  });
});
