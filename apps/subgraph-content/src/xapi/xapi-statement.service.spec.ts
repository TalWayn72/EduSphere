/**
 * xapi-statement.service.spec.ts — Unit tests for F-028 XapiStatementService
 *
 * Tests:
 *  1.  course.completed → completed verb URI
 *  2.  quiz.passed → passed verb URI
 *  3.  annotation.created → annotated verb URI
 *  4.  user.followed → follow verb URI
 *  5.  storeStatement saves to xapi_statements table
 *  6.  queryStatements filters by tenantId
 *  7.  queryStatements respects limit parameter
 *  8.  unknown events return null from mapNatsToXapi
 *  9.  external LRS forwarding fires fetch with correct auth header
 * 10.  external LRS timeout after 5 seconds doesn't block
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XAPI_VERBS } from './xapi.types.js';

const { mockCloseAllPools, mockWithTenantContext, mockNatsConnect } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockWithTenantContext = vi.fn();
  const asyncIter = { next: vi.fn().mockResolvedValue({ done: true }) };
  const mockSub = { unsubscribe: vi.fn(), [Symbol.asyncIterator]: vi.fn().mockReturnValue(asyncIter) };
  const mockNatsConnect = vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue(mockSub),
    drain: vi.fn().mockResolvedValue(undefined),
  });
  return { mockCloseAllPools, mockWithTenantContext, mockNatsConnect };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({}),
  closeAllPools: mockCloseAllPools,
  schema: {
    xapiStatements: { tenantId: 'tenantId', storedAt: 'storedAt', statementId: 'statementId' },
  },
  eq: vi.fn((_a, _b) => 'eq'),
  and: vi.fn((...args) => args),
  gte: vi.fn((_a, _b) => 'gte'),
  lte: vi.fn((_a, _b) => 'lte'),
  withTenantContext: mockWithTenantContext,
}));

vi.mock('nats', () => ({
  connect: mockNatsConnect,
  StringCodec: vi.fn().mockReturnValue({ decode: vi.fn().mockReturnValue('{}'), encode: vi.fn() }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn().mockReturnValue({ servers: 'nats://localhost:4222' }),
}));

import { XapiStatementService } from './xapi-statement.service.js';
import type { XapiStatement } from './xapi.types.js';

function makeService() {
  return new XapiStatementService();
}

const validPayload = { userId: 'user-1', tenantId: 'tenant-1', courseId: 'course-abc', courseTitle: 'Intro to TS' };

describe('XapiStatementService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('test 1: course.completed maps to completed verb URI', () => {
    const svc = makeService();
    const stmt = svc.mapNatsToXapi('EDUSPHERE.course.completed', validPayload);
    expect(stmt).not.toBeNull();
    expect(stmt?.verb.id).toBe(XAPI_VERBS.COMPLETED);
  });

  it('test 2: quiz.passed maps to passed verb URI', () => {
    const svc = makeService();
    const payload = { userId: 'u-1', tenantId: 't-1', contentItemId: 'quiz-1' };
    const stmt = svc.mapNatsToXapi('EDUSPHERE.quiz.passed', payload);
    expect(stmt?.verb.id).toBe(XAPI_VERBS.PASSED);
  });

  it('test 3: annotation.created maps to annotated verb URI', () => {
    const svc = makeService();
    const payload = { userId: 'u-1', tenantId: 't-1', annotationId: 'ann-1' };
    const stmt = svc.mapNatsToXapi('EDUSPHERE.annotation.created', payload);
    expect(stmt?.verb.id).toBe(XAPI_VERBS.ANNOTATED);
  });

  it('test 4: user.followed maps to follow verb URI', () => {
    const svc = makeService();
    const payload = { userId: 'u-1', tenantId: 't-1', followingId: 'u-2' };
    const stmt = svc.mapNatsToXapi('EDUSPHERE.user.followed', payload);
    expect(stmt?.verb.id).toBe(XAPI_VERBS.FOLLOWED);
  });

  it('test 5: storeStatement saves to xapi_statements table', async () => {
    const mockInsert = vi.fn().mockResolvedValue([]);
    mockWithTenantContext.mockImplementationOnce(async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
      fn({ insert: vi.fn().mockReturnValue({ values: mockInsert }) }),
    );
    const svc = makeService();
    const stmt: XapiStatement = {
      id: 'stmt-uuid-1',
      actor: { objectType: 'Agent', name: 'user-1', mbox: 'mailto:user-1@edusphere.local' },
      verb: { id: XAPI_VERBS.COMPLETED, display: { en: 'completed' } },
      object: { objectType: 'Activity', id: 'https://edusphere.io/activities/course-1', definition: { name: { en: 'Test Course' } } },
    };
    await svc.storeStatement('tenant-1', stmt);
    expect(mockWithTenantContext).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ statementId: 'stmt-uuid-1', tenantId: 'tenant-1' }));
  });

  it('test 6: queryStatements filters by tenantId', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }),
    });
    mockWithTenantContext.mockImplementationOnce(async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
      fn({ select: mockSelect }),
    );
    const svc = makeService();
    const result = await svc.queryStatements('tenant-1', { limit: 10 });
    expect(mockWithTenantContext).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('test 7: queryStatements respects limit parameter (max 200)', async () => {
    let capturedLimit = 0;
    mockWithTenantContext.mockImplementationOnce(async (_d: unknown, _c: unknown, fn: (tx: unknown) => unknown) =>
      fn({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: (n: number) => { capturedLimit = n; return { orderBy: vi.fn().mockResolvedValue([]) }; },
            }),
          }),
        }),
      }),
    );
    const svc = makeService();
    await svc.queryStatements('tenant-1', { limit: 9999 });
    expect(capturedLimit).toBe(200); // capped at max 200
  });

  it('test 8: unknown NATS subject returns null from mapNatsToXapi', () => {
    const svc = makeService();
    const stmt = svc.mapNatsToXapi('EDUSPHERE.unknown.event', validPayload);
    expect(stmt).toBeNull();
  });

  it('test 9: external LRS forwarding fires fetch with correct auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal('fetch', mockFetch);
    const svc = makeService();
    const stmt: XapiStatement = {
      id: 'stmt-uuid-2',
      actor: { objectType: 'Agent', name: 'u-1', mbox: 'mailto:u-1@edusphere.local' },
      verb: { id: XAPI_VERBS.PASSED, display: { en: 'passed' } },
      object: { objectType: 'Activity', id: 'https://edusphere.io/activities/quiz-1', definition: { name: { en: 'Quiz' } } },
    };
    await svc.forwardToExternalLrs('https://lrs.example.com', 'my-raw-token', stmt);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://lrs.example.com/statements',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer my-raw-token' }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it('test 10: external LRS timeout after 5 seconds does not block', async () => {
    vi.useFakeTimers();
    const neverResolve = new Promise<Response>(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(neverResolve));
    const svc = makeService();
    const stmt: XapiStatement = {
      id: 'stmt-uuid-3',
      actor: { objectType: 'Agent', name: 'u-1', mbox: 'mailto:u-1@edusphere.local' },
      verb: { id: XAPI_VERBS.FAILED, display: { en: 'failed' } },
      object: { objectType: 'Activity', id: 'https://edusphere.io/activities/quiz-1', definition: { name: { en: 'Quiz' } } },
    };
    const promise = svc.forwardToExternalLrs('https://slow-lrs.example.com', 'tok', stmt);
    vi.advanceTimersByTime(5001);
    await expect(promise).rejects.toThrow('LRS forward timeout');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
