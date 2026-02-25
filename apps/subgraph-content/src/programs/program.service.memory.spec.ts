/**
 * Memory safety tests for ProgramService (F-026)
 *
 * Verifies that OnModuleDestroy:
 *  1. Calls closeAllPools and drains NATS
 *  2. NATS subscription loop exits cleanly
 *  3. Concurrent course completions resolve correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks (must run before vi.mock factories) ────────────────────────

const { mockUnsubscribe, mockDrain } = vi.hoisted(() => ({
  mockUnsubscribe: vi.fn(),
  mockDrain: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    credentialPrograms: {},
    programEnrollments: {},
    userCourses: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(async (_, __, fn: (db: unknown) => unknown) => fn({})),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
  isCourseCompletedEvent: vi.fn(() => false),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue({
      unsubscribe: mockUnsubscribe,
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      }),
    }),
    drain: mockDrain,
  }),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

vi.mock('../certificate/certificate.service.js', () => ({
  CertificateService: vi.fn().mockImplementation(function CertificateServiceCtor() {
    return { generateCertificate: vi.fn().mockResolvedValue({ id: 'cert-1' }) };
  }),
}));

// ─── Import after mocks ────────────────────────────────────────────────────────

import { ProgramService } from './program.service';
import { closeAllPools } from '@edusphere/db';
import { CertificateService } from '../certificate/certificate.service.js';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProgramService — memory safety', () => {
  let service: ProgramService;
  let certService: CertificateService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUnsubscribe.mockReset();
    mockDrain.mockReset().mockResolvedValue(undefined);

    certService = new (vi.mocked(CertificateService))();
    service = new ProgramService(certService);
    // Explicitly call lifecycle hook (NestJS doesn't call it in direct instantiation)
    await service.onModuleInit();
  });

  // ─── 1. onModuleDestroy calls closeAllPools and drains NATS ───────────────

  it('onModuleDestroy calls closeAllPools and drains NATS connection', async () => {
    await service.onModuleDestroy();

    expect(closeAllPools).toHaveBeenCalledOnce();
    expect(mockDrain).toHaveBeenCalledOnce();
  });

  // ─── 2. NATS subscription loop exits cleanly ──────────────────────────────

  it('NATS subscription loop exits cleanly on unsubscribe', async () => {
    // Call destroy which triggers unsubscribe
    await service.onModuleDestroy();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    // nc should be nulled out after destroy
    expect((service as unknown as { nc: unknown }).nc).toBeNull();
    expect((service as unknown as { sub: unknown }).sub).toBeNull();
  });

  // ─── 3. Concurrent course completions resolve correctly ───────────────────

  it('concurrent course completions resolve without collision', async () => {
    const getProgramProgressSpy = vi.spyOn(service, 'getProgramProgress').mockResolvedValue({
      totalCourses: 3,
      completedCourses: 2,
      completedCourseIds: ['c1', 'c2'],
      percentComplete: 67,
    });

    const enrollment = { id: 'enroll-1', userId: 'user-1', programId: 'prog-1', tenantId: 'tenant-1', completedAt: null };
    const program = { id: 'prog-1', tenantId: 'tenant-1', requiredCourseIds: ['c1', 'c2', 'c3'] };

    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext)
      // h1: getUserEnrollments
      .mockImplementationOnce(async (_, __, fn) => fn({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([enrollment]) }) }) } as never))
      // h2: getUserEnrollments
      .mockImplementationOnce(async (_, __, fn) => fn({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([enrollment]) }) }) } as never))
      // h1: checkProgramCompletion → program fetch
      .mockImplementationOnce(async (_, __, fn) => fn({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([program]) }) }) }) } as never))
      // h2: checkProgramCompletion → program fetch
      .mockImplementationOnce(async (_, __, fn) => fn({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([program]) }) }) }) } as never));

    // Fire two completions concurrently for the same program
    const payload = {
      courseId: 'c3',
      userId: 'user-1',
      tenantId: 'tenant-1',
      completionDate: new Date().toISOString(),
    };

    const handler = (service as unknown as { handleCourseCompleted: (p: unknown) => Promise<void> })
      .handleCourseCompleted.bind(service);

    await Promise.all([handler(payload), handler(payload)]);

    // Progress was evaluated; cert was NOT issued since percentComplete < 100
    expect(getProgramProgressSpy).toHaveBeenCalled();
    expect(certService.generateCertificate).not.toHaveBeenCalled();
  });
});
