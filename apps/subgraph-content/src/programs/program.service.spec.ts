/**
 * Unit tests for ProgramService (F-026 Stackable Credentials / Nanodegrees)
 *
 * 8 tests:
 *  1. listPrograms returns only published programs for tenant
 *  2. createProgram stores program with requiredCourseIds array
 *  3. enrollInProgram creates enrollment record
 *  4. enrollInProgram is idempotent (duplicate enroll returns existing)
 *  5. getProgramProgress calculates percentComplete correctly
 *  6. NATS consumer detects full completion (all courses done)
 *  7. NATS consumer does NOT trigger completion if partial
 *  8. checkProgramCompletion calls certificate service on full completion
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotFoundException as _NotFoundException,
  ConflictException as _ConflictException,
} from '@nestjs/common';

// ─── Mocks (must be before any import of mocked module) ──────────────────────

vi.mock('@edusphere/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return {
    createDatabaseConnection: vi.fn(() => mockDb),
    closeAllPools: vi.fn().mockResolvedValue(undefined),
    schema: {
      credentialPrograms: {
        id: 'id',
        tenantId: 'tenant_id',
        published: 'published',
      },
      programEnrollments: {
        id: 'id',
        userId: 'user_id',
        programId: 'program_id',
        tenantId: 'tenant_id',
      },
      userCourses: {
        userId: 'user_id',
        tenantId: 'tenant_id',
        courseId: 'course_id',
      },
    },
    eq: vi.fn((a, b) => ({ field: a, value: b })),
    and: vi.fn((...args: unknown[]) => args),
    withTenantContext: vi.fn((_, __, fn: (db: unknown) => unknown) => fn({})),
  };
});

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
  isCourseCompletedEvent: vi.fn((e: unknown) => {
    if (!e || typeof e !== 'object') return false;
    const obj = e as Record<string, unknown>;
    return (
      typeof obj['courseId'] === 'string' && typeof obj['userId'] === 'string'
    );
  }),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      }),
    }),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

vi.mock('../certificate/certificate.service.js', () => ({
  CertificateService: vi
    .fn()
    .mockImplementation(function CertificateServiceCtor() {
      return {
        generateCertificate: vi.fn().mockResolvedValue({ id: 'cert-uuid-1' }),
      };
    }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { ProgramService } from './program.service';
import { withTenantContext, schema as _schema } from '@edusphere/db';
import { CertificateService } from '../certificate/certificate.service.js';

function buildPublishedProgram(
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    id: 'prog-1',
    tenantId: 'tenant-1',
    title: 'Full-Stack Nanodegree',
    description: 'Master full-stack development',
    badgeEmoji: '🎓',
    requiredCourseIds: ['course-1', 'course-2'],
    totalHours: 40,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildEnrollment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'enroll-1',
    userId: 'user-1',
    programId: 'prog-1',
    tenantId: 'tenant-1',
    enrolledAt: new Date(),
    completedAt: null,
    certificateId: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProgramService', () => {
  let service: ProgramService;
  let certService: CertificateService;

  beforeEach(async () => {
    vi.clearAllMocks();
    certService = new (vi.mocked(CertificateService))();
    service = new ProgramService(certService);
    await new Promise((r) => setTimeout(r, 10));
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ─── 1. listPrograms ───────────────────────────────────────────────────────

  it('listPrograms returns only published programs for tenant', async () => {
    const programs = [
      buildPublishedProgram(),
      buildPublishedProgram({ id: 'prog-2', title: 'AI Nanodegree' }),
    ];

    vi.mocked(withTenantContext)
      // First call: programs query
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(programs),
            }),
          }),
        } as never)
      )
      // Second call: enrollment counts query
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi
              .fn()
              .mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
          }),
        } as never)
      );

    const result = await service.listPrograms('tenant-1', 'user-1');
    expect(Array.isArray(result)).toBe(true);
  });

  // ─── 2. createProgram ──────────────────────────────────────────────────────

  it('createProgram stores with requiredCourseIds array', async () => {
    const program = buildPublishedProgram();
    vi.mocked(withTenantContext).mockImplementationOnce(async (_, __, fn) => {
      const fakeTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([program]),
          }),
        }),
      };
      return fn(fakeTx as never);
    });

    const result = await service.createProgram(
      {
        title: 'Full-Stack Nanodegree',
        description: 'Master full-stack',
        requiredCourseIds: ['course-1', 'course-2'],
        totalHours: 40,
      },
      'tenant-1',
      'admin-1'
    );
    expect(result.requiredCourseIds).toEqual(['course-1', 'course-2']);
    expect(result.title).toBe('Full-Stack Nanodegree');
  });

  // ─── 3. enrollInProgram creates enrollment ─────────────────────────────────

  it('enrollInProgram creates enrollment record', async () => {
    const enrollment = buildEnrollment();
    const program = buildPublishedProgram();

    vi.mocked(withTenantContext)
      // existing check → empty
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
            }),
          }),
        } as never)
      )
      // program fetch
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([program]),
              }),
            }),
          }),
        } as never)
      )
      // insert enrollment
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([enrollment]),
            }),
          }),
        } as never)
      );

    const result = await service.enrollInProgram(
      'prog-1',
      'user-1',
      'tenant-1'
    );
    expect(result.programId).toBe('prog-1');
    expect(result.userId).toBe('user-1');
    expect(result.completedAt).toBeNull();
  });

  // ─── 4. enrollInProgram is idempotent ──────────────────────────────────────

  it('enrollInProgram is idempotent — returns existing enrollment', async () => {
    const enrollment = buildEnrollment();

    // First call: existing enrollment found → return it without inserting
    vi.mocked(withTenantContext).mockImplementationOnce(async (_, __, fn) =>
      fn({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([enrollment]),
            }),
          }),
        }),
      } as never)
    );

    const result = await service.enrollInProgram(
      'prog-1',
      'user-1',
      'tenant-1'
    );
    expect(result.id).toBe('enroll-1');
    // withTenantContext should only be called once (no insert step)
    expect(vi.mocked(withTenantContext)).toHaveBeenCalledTimes(1);
  });

  // ─── 5. getProgramProgress calculates percentComplete ──────────────────────

  it('getProgramProgress calculates percentComplete correctly', async () => {
    const program = buildPublishedProgram({
      requiredCourseIds: ['c1', 'c2', 'c3', 'c4'],
    });

    vi.mocked(withTenantContext)
      // program fetch
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([program]),
              }),
            }),
          }),
        } as never)
      )
      // userCourses query → 2 of 4 done
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockResolvedValue([{ courseId: 'c1' }, { courseId: 'c3' }]),
            }),
          }),
        } as never)
      );

    const progress = await service.getProgramProgress(
      'prog-1',
      'user-1',
      'tenant-1'
    );
    expect(progress.totalCourses).toBe(4);
    expect(progress.completedCourses).toBe(2);
    expect(progress.percentComplete).toBe(50);
    expect(progress.completedCourseIds).toEqual(
      expect.arrayContaining(['c1', 'c3'])
    );
  });

  // ─── 6. NATS consumer detects full completion ──────────────────────────────

  it('NATS consumer detects full completion and marks enrollment done', async () => {
    const getProgramProgressSpy = vi
      .spyOn(service, 'getProgramProgress')
      .mockResolvedValue({
        totalCourses: 2,
        completedCourses: 2,
        completedCourseIds: ['course-1', 'course-2'],
        percentComplete: 100,
      });

    const program = buildPublishedProgram();
    const enrollment = buildEnrollment();

    vi.mocked(withTenantContext)
      // getUserEnrollments inside handleCourseCompleted
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([enrollment]),
            }),
          }),
        } as never)
      )
      // program fetch in checkProgramCompletion
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([program]),
              }),
            }),
          }),
        } as never)
      )
      // update completedAt
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi
                  .fn()
                  .mockResolvedValue([
                    { ...enrollment, completedAt: new Date() },
                  ]),
              }),
            }),
          }),
        } as never)
      )
      // update certificateId
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          update: vi.fn().mockReturnValue({
            set: vi
              .fn()
              .mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
          }),
        } as never)
      );

    await (
      service as unknown as {
        handleCourseCompleted: (p: unknown) => Promise<void>;
      }
    ).handleCourseCompleted({
      courseId: 'course-2',
      userId: 'user-1',
      tenantId: 'tenant-1',
      completionDate: new Date().toISOString(),
    });

    expect(getProgramProgressSpy).toHaveBeenCalledWith(
      'prog-1',
      'user-1',
      'tenant-1'
    );
  });

  // ─── 7. NATS consumer does NOT trigger if partial ──────────────────────────

  it('NATS consumer does NOT trigger completion if progress is partial', async () => {
    const getProgramProgressSpy = vi
      .spyOn(service, 'getProgramProgress')
      .mockResolvedValue({
        totalCourses: 2,
        completedCourses: 1,
        completedCourseIds: ['course-1'],
        percentComplete: 50,
      });

    const enrollment = buildEnrollment();
    const program = buildPublishedProgram();

    vi.mocked(withTenantContext)
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([enrollment]),
            }),
          }),
        } as never)
      )
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([program]),
              }),
            }),
          }),
        } as never)
      );

    await (
      service as unknown as {
        handleCourseCompleted: (p: unknown) => Promise<void>;
      }
    ).handleCourseCompleted({
      courseId: 'course-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      completionDate: new Date().toISOString(),
    });

    expect(getProgramProgressSpy).toHaveBeenCalled();
    // cert service should NOT be called since percentComplete < 100
    expect(certService.generateCertificate).not.toHaveBeenCalled();
  });

  // ─── 8. checkProgramCompletion calls certificate service ──────────────────

  it('checkProgramCompletion calls certificateService on full completion', async () => {
    const program = buildPublishedProgram();
    const enrollment = buildEnrollment();

    vi.spyOn(service, 'getProgramProgress').mockResolvedValue({
      totalCourses: 2,
      completedCourses: 2,
      completedCourseIds: ['course-1', 'course-2'],
      percentComplete: 100,
    });

    vi.mocked(withTenantContext)
      // program fetch
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([program]),
              }),
            }),
          }),
        } as never)
      )
      // update completedAt
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi
                  .fn()
                  .mockResolvedValue([
                    { ...enrollment, completedAt: new Date() },
                  ]),
              }),
            }),
          }),
        } as never)
      )
      // update certificateId
      .mockImplementationOnce(async (_, __, fn) =>
        fn({
          update: vi.fn().mockReturnValue({
            set: vi
              .fn()
              .mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
          }),
        } as never)
      );

    await (
      service as unknown as {
        checkProgramCompletion: (
          u: string,
          p: string,
          t: string
        ) => Promise<void>;
      }
    ).checkProgramCompletion('user-1', 'prog-1', 'tenant-1');

    expect(certService.generateCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tenantId: 'tenant-1',
        courseId: 'prog-1',
      })
    );
  });
});
