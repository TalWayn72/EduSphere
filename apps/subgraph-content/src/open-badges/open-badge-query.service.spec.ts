/**
 * OpenBadgeQueryService unit tests — read queries and OBv3 credential builder.
 * 14 tests covering getAssertionById, getUserBadges, buildCredentialBody, etc.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext, mockDbSelect } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
  mockDbSelect: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockDbSelect,
  })),
  withTenantContext: mockWithTenantContext,
  schema: {
    openBadgeAssertions: {
      id: 'id',
      badgeDefinitionId: 'badgeDefinitionId',
      recipientId: 'recipientId',
      tenantId: 'tenantId',
      revoked: 'revoked',
      issuedAt: 'issuedAt',
    },
    openBadgeDefinitions: {
      id: 'id',
      tenantId: 'tenantId',
      name: 'name',
      description: 'description',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('./open-badge.types.js', () => ({
  buildLinkedInShareUrl: vi.fn(
    (name: string, _issued: string, url: string) =>
      `https://linkedin.com/share?name=${name}&url=${url}`
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { OpenBadgeQueryService } from './open-badge-query.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT = 'tenant-001';
const USER = 'user-abc';

function makeAssertion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assertion-1',
    badgeDefinitionId: 'def-1',
    recipientId: USER,
    tenantId: TENANT,
    issuedAt: new Date('2025-06-01'),
    expiresAt: null,
    evidenceUrl: null,
    revoked: false,
    proof: { type: 'Ed25519Signature2020', created: '2025-06-01T00:00:00Z' },
    ...overrides,
  };
}

function makeDefinition(overrides: Record<string, unknown> = {}) {
  return {
    id: 'def-1',
    tenantId: TENANT,
    name: 'AI Mastery',
    description: 'Completed AI course',
    imageUrl: null,
    criteriaUrl: null,
    tags: [],
    ...overrides,
  };
}

function makeKeyPair() {
  return {
    privateKey: {} as never,
    publicKey: {} as never,
    issuerDid: 'did:key:test123',
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OpenBadgeQueryService', () => {
  let svc: OpenBadgeQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new OpenBadgeQueryService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(OpenBadgeQueryService);
  });

  // ── getAssertionById ──────────────────────────────────────────────────────

  it('getAssertionById returns assertion when found', async () => {
    const assertion = makeAssertion();
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([assertion]),
    };
    mockDbSelect.mockReturnValue(chain);

    const result = await svc.getAssertionById('assertion-1');

    expect(result).toEqual(assertion);
  });

  it('getAssertionById returns null when not found', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockDbSelect.mockReturnValue(chain);

    const result = await svc.getAssertionById('nonexistent');

    expect(result).toBeNull();
  });

  // ── getDefinitionById ─────────────────────────────────────────────────────

  it('getDefinitionById returns definition when found', async () => {
    const def = makeDefinition();
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([def]),
    };
    mockDbSelect.mockReturnValue(chain);

    const result = await svc.getDefinitionById('def-1');

    expect(result).toEqual(def);
  });

  it('getDefinitionById returns null when not found', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockDbSelect.mockReturnValue(chain);

    const result = await svc.getDefinitionById('nonexistent');

    expect(result).toBeNull();
  });

  // ── getUserBadges ─────────────────────────────────────────────────────────

  it('getUserBadges returns mapped badge assertion results', async () => {
    const assertion = makeAssertion();
    const def = makeDefinition();
    mockWithTenantContext.mockResolvedValueOnce([
      {
        id: assertion.id,
        badgeName: def.name,
        badgeDescription: def.description,
      },
    ]);

    const results = await svc.getUserBadges(USER, TENANT);

    expect(results).toHaveLength(1);
  });

  it('getUserBadges returns empty array when user has no badges', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const results = await svc.getUserBadges(USER, TENANT);

    expect(results).toEqual([]);
  });

  // ── getBadgeDefinitions ───────────────────────────────────────────────────

  it('getBadgeDefinitions returns definitions for tenant', async () => {
    const defs = [
      makeDefinition(),
      makeDefinition({ id: 'def-2', name: 'Graph Expert' }),
    ];
    mockWithTenantContext.mockResolvedValueOnce(defs);

    const results = await svc.getBadgeDefinitions(TENANT);

    expect(results).toHaveLength(2);
  });

  // ── buildCredentialBody ───────────────────────────────────────────────────

  it('buildCredentialBody returns valid OBv3 structure', () => {
    const def = makeDefinition() as never;
    const input = {
      userId: USER,
      badgeDefinitionId: 'def-1',
      tenantId: TENANT,
    };
    const keyPair = makeKeyPair();

    const body = svc.buildCredentialBody(def, input, keyPair);

    expect(body['@context']).toHaveLength(2);
    expect(body.type).toContain('VerifiableCredential');
    expect(body.type).toContain('OpenBadgeCredential');
    expect(body.issuer.id).toBe('did:key:test123');
    expect(body.credentialSubject.id).toBe(`did:example:${USER}`);
  });

  it('buildCredentialBody includes expirationDate when expiresAt provided', () => {
    const def = makeDefinition() as never;
    const expiresAt = new Date('2026-12-31');
    const input = {
      userId: USER,
      badgeDefinitionId: 'def-1',
      tenantId: TENANT,
      expiresAt,
    };
    const keyPair = makeKeyPair();

    const body = svc.buildCredentialBody(def, input, keyPair);

    expect(body.expirationDate).toBe('2026-12-31T00:00:00.000Z');
  });

  it('buildCredentialBody omits expirationDate when expiresAt is undefined', () => {
    const def = makeDefinition() as never;
    const input = {
      userId: USER,
      badgeDefinitionId: 'def-1',
      tenantId: TENANT,
    };
    const keyPair = makeKeyPair();

    const body = svc.buildCredentialBody(def, input, keyPair);

    expect(body.expirationDate).toBeUndefined();
  });

  // ── mapAssertion ──────────────────────────────────────────────────────────

  it('mapAssertion returns correct BadgeAssertionResult shape', () => {
    const assertion = makeAssertion() as never;

    const result = svc.mapAssertion(assertion, 'AI Mastery', 'Completed AI');

    expect(result.id).toBe('assertion-1');
    expect(result.badgeName).toBe('AI Mastery');
    expect(result.verifyUrl).toContain('assertion-1');
    expect(result.shareUrl).toBeTruthy();
  });

  it('mapAssertion sets expiresAt to null when assertion has no expiry', () => {
    const assertion = makeAssertion({ expiresAt: null }) as never;

    const result = svc.mapAssertion(assertion, 'Test', 'Desc');

    expect(result.expiresAt).toBeNull();
  });
});
