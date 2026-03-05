/**
 * Memory safety tests for ProgramEventsHandler (F-026)
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
  withTenantContext: vi.fn(async (_, __, fn: (db: unknown) => unknown) =>
    fn({})
  ),
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
  CertificateService: vi
    .fn()
    .mockImplementation(function CertificateServiceCtor() {
      return {
        generateCertificate: vi.fn().mockResolvedValue({ id: 'cert-1' }),
      };
    }),
}));

// ─── Import after mocks ────────────────────────────────────────────────────────

import { ProgramEventsHandler } from './program-events.handler';
import { closeAllPools } from '@edusphere/db';
import { CertificateService } from '../certificate/certificate.service.js';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProgramEventsHandler — memory safety', () => {
  let handler: ProgramEventsHandler;
  let certService: CertificateService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUnsubscribe.mockReset();
    mockDrain.mockReset().mockResolvedValue(undefined);

    certService = new (vi.mocked(CertificateService))();
    handler = new ProgramEventsHandler(certService);
    // Explicitly call lifecycle hook (NestJS doesn't call it in direct instantiation)
    await handler.onModuleInit();
  });

  // ─── 1. onModuleDestroy calls closeAllPools and drains NATS ───────────────

  it('onModuleDestroy calls closeAllPools and drains NATS connection', async () => {
    await handler.onModuleDestroy();

    expect(closeAllPools).toHaveBeenCalledOnce();
    expect(mockDrain).toHaveBeenCalledOnce();
  });

  // ─── 2. NATS subscription loop exits cleanly ──────────────────────────────

  it('NATS subscription loop exits cleanly on unsubscribe', async () => {
    await handler.onModuleDestroy();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    // nc should be nulled out after destroy
    expect((handler as unknown as { nc: unknown }).nc).toBeNull();
    expect((handler as unknown as { sub: unknown }).sub).toBeNull();
  });

  // ─── 3. Concurrent course completions resolve correctly ───────────────────

  it('concurrent course completions resolve without collision', async () => {
    const enrollment = {
      id: 'enroll-1',
      userId: 'user-1',
      programId: 'prog-1',
      tenantId: 'tenant-1',
      completedAt: null,
    };
    const program = {
      id: 'prog-1',
      tenantId: 'tenant-1',
      requiredCourseIds: ['c1', 'c2', 'c3'],
      badgeEmoji: '\uD83C\uDF93',
      title: 'Test Program',
    };

    const { withTenantContext } = await import('@edusphere/db');

    // Use a general mock that supports concurrent calls regardless of ordering.
    // The where() result must support both .limit() (program fetch) and
    // direct resolution (enrollments / userCourses).
    const makeWhereResult = (directResult: unknown[]) => {
      const obj = Object.assign(Promise.resolve(directResult), {
        limit: vi.fn().mockResolvedValue([program]),
      });
      return obj;
    };

    vi.mocked(withTenantContext).mockImplementation(
      async (_, __, fn: (db: unknown) => unknown) =>
        fn({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockReturnValueOnce(makeWhereResult([enrollment]))
                .mockReturnValue(makeWhereResult([{ courseId: 'c1' }, { courseId: 'c2' }])),
            }),
          }),
        } as never)
    );

    // Fire two completions concurrently for the same program
    const payload = {
      courseId: 'c2',
      userId: 'user-1',
      tenantId: 'tenant-1',
      completionDate: new Date().toISOString(),
    };

    const handleFn = (
      handler as unknown as {
        handleCourseCompleted: (p: unknown) => Promise<void>;
      }
    ).handleCourseCompleted.bind(handler);

    await Promise.all([handleFn(payload), handleFn(payload)]);

    // cert was NOT issued since only 2 of 3 courses done
    expect(certService.generateCertificate).not.toHaveBeenCalled();
  });
});
