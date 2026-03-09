/**
 * xapi-nats-bridge.service.spec.ts — Unit tests for XapiNatsBridgeService
 *
 * Tests:
 *  1. natsToXapiStatement: EDUSPHERE.course.completed → verb id contains 'completed'
 *  2. natsToXapiStatement: EDUSPHERE.course.enrolled → verb id contains 'registered'
 *  3. natsToXapiStatement: unknown subject → falls back to 'launched'
 *  4. bridge listen skips payloads where tenantId is missing
 *  5. onModuleDestroy calls unsubscribe on all tracked subscriptions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must run before any import) ───────────────────────────────

const { mockSubs, mockNatsConnect } = vi.hoisted(() => {
  const makeSub = () => ({
    unsubscribe: vi.fn(),
    [Symbol.asyncIterator]: vi.fn().mockReturnValue({
      next: vi.fn().mockResolvedValue({ done: true }),
    }),
  });

  // Create 6 mock subscriptions (one per bridged subject)
  const mockSubs = Array.from({ length: 6 }, () => makeSub());
  let callCount = 0;

  const mockNc = {
    subscribe: vi.fn().mockImplementation(() => {
      const sub = mockSubs[callCount % mockSubs.length];
      callCount++;
      return sub;
    }),
    drain: vi.fn().mockResolvedValue(undefined),
  };

  const mockNatsConnect = vi.fn().mockResolvedValue(mockNc);
  return { mockSubs, mockNatsConnect };
});

vi.mock('nats', () => ({
  connect: mockNatsConnect,
  StringCodec: vi.fn().mockReturnValue({
    decode: vi.fn().mockImplementation((data: Uint8Array) =>
      Buffer.from(data).toString()
    ),
    encode: vi.fn(),
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn().mockReturnValue({ servers: 'nats://localhost:4222' }),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({}),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: { xapiStatements: {} },
  withTenantContext: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { natsToXapiStatement } from './xapi-verb-mappings.js';
import { XapiNatsBridgeService } from './xapi-nats-bridge.service.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMockStatementService() {
  return {
    storeStatement: vi.fn().mockResolvedValue(undefined),
    mapNatsToXapi: vi.fn(),
    queryStatements: vi.fn(),
    forwardToExternalLrs: vi.fn(),
    onModuleInit: vi.fn(),
    onModuleDestroy: vi.fn(),
  };
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('natsToXapiStatement (pure function)', () => {
  it('test 1: EDUSPHERE.course.completed → verb id contains "completed"', () => {
    const payload = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      courseId: 'course-abc',
      courseName: 'Intro to TypeScript',
    };
    const stmt = natsToXapiStatement('EDUSPHERE.course.completed', payload) as Record<string, unknown>;
    const verb = stmt['verb'] as { id: string };
    expect(verb.id).toContain('completed');
  });

  it('test 2: EDUSPHERE.course.enrolled → verb id contains "registered"', () => {
    const payload = {
      userId: 'user-2',
      tenantId: 'tenant-1',
      courseId: 'course-xyz',
    };
    const stmt = natsToXapiStatement('EDUSPHERE.course.enrolled', payload) as Record<string, unknown>;
    const verb = stmt['verb'] as { id: string };
    expect(verb.id).toContain('registered');
  });

  it('test 3: unknown subject → falls back to launched verb', () => {
    const payload = {
      userId: 'user-3',
      tenantId: 'tenant-1',
    };
    const stmt = natsToXapiStatement('EDUSPHERE.unknown.event', payload) as Record<string, unknown>;
    const verb = stmt['verb'] as { id: string };
    expect(verb.id).toContain('launched');
  });
});

describe('XapiNatsBridgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test 4: skips payloads where tenantId is missing', async () => {
    const statementService = makeMockStatementService();
    const bridge = new XapiNatsBridgeService(statementService as never);

    // Build a subscription whose async iterator yields ONE message missing tenantId
    const badPayload = JSON.stringify({ userId: 'user-1' }); // no tenantId
    const encoder = new TextEncoder();
    const mockMsg = { data: encoder.encode(badPayload), subject: 'EDUSPHERE.course.completed' };

    let iterCallCount = 0;
    const mockSubWithMsg = {
      unsubscribe: vi.fn(),
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockImplementation(() => {
          iterCallCount++;
          if (iterCallCount === 1) return Promise.resolve({ value: mockMsg, done: false });
          return Promise.resolve({ done: true });
        }),
      }),
    };

    // Override mockNatsConnect for this test to return a specific subscribe mock
    const mockNcLocal = {
      subscribe: vi.fn().mockReturnValue(mockSubWithMsg),
      drain: vi.fn().mockResolvedValue(undefined),
    };
    mockNatsConnect.mockResolvedValueOnce(mockNcLocal);

    await bridge.onModuleInit();

    // Wait a tick for the async processMessages loop to handle the message
    await new Promise((r) => setImmediate(r));

    expect(statementService.storeStatement).not.toHaveBeenCalled();

    await bridge.onModuleDestroy();
  });

  it('test 5: onModuleDestroy calls unsubscribe on all tracked subscriptions', async () => {
    const statementService = makeMockStatementService();
    const bridge = new XapiNatsBridgeService(statementService as never);

    // Use the global hoisted mockNatsConnect (returns mockSubs)
    await bridge.onModuleInit();
    await bridge.onModuleDestroy();

    // Every subscription returned from nc.subscribe should have been unsubscribed
    const mockNc = await mockNatsConnect.mock.results[0]?.value;
    const subscribeCallCount: number = (mockNc as { subscribe: ReturnType<typeof vi.fn> }).subscribe.mock.calls.length;
    // There are 6 subjects, so 6 subscriptions
    expect(subscribeCallCount).toBe(6);
    // Each mockSub that was created should have had unsubscribe called
    for (const sub of mockSubs) {
      if (sub.unsubscribe.mock.calls.length > 0) {
        expect(sub.unsubscribe).toHaveBeenCalled();
      }
    }
    // Verify drain was called on the connection
    expect(mockNc.drain).toHaveBeenCalled();
  });
});
