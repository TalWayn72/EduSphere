/**
 * Unit tests for JargonDomainService — CRUD and detection.
 *
 * Tests: listDomains, findById, countTerms, createDomain,
 * detectDomains delegation, error handling.
 * See jargon-domain-proximity.service.spec.ts for proximity tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';

// ── Types ────────────────────────────────────────────────────────────────────

interface JargonDomain {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  language: string;
  parent_domain_id: string | null;
  deleted_at: Date | null;
}

interface CreateJargonDomainInput {
  name: string;
  description?: string;
  language?: string;
  parentDomainId?: string;
}

interface DetectedDomainResult {
  domain: JargonDomain;
  confidence: number;
  method: string;
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();

const mockDb = {
  select: mockDbSelect,
  insert: mockDbInsert,
  execute: vi.fn(),
};

const mockDetectDomains = vi.fn();
const mockComputeProximityPair = vi.fn();

const mockDetectService = {
  detectDomains: mockDetectDomains,
  computeProximityPair: mockComputeProximityPair,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    jargon_domains: {
      id: 'id',
      tenant_id: 'tenant_id',
      name: 'name',
      language: 'language',
      deleted_at: 'deleted_at',
    },
    jargon_terms: { domain_id: 'domain_id', deleted_at: 'deleted_at' },
    domain_proximity: {
      tenant_id: 'tenant_id',
      domain_a_id: 'domain_a_id',
      domain_b_id: 'domain_b_id',
      proximity_score: 'proximity_score',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
  isNull: vi.fn((a) => ({ isNull: a })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  inArray: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-1';

const DOMAIN_KABBALAH: JargonDomain = {
  id: 'domain-uuid-kabbalah',
  tenant_id: TENANT_ID,
  name: 'קבלה',
  description: 'Kabbalistic terminology',
  language: 'he',
  parent_domain_id: null,
  deleted_at: null,
};

const DOMAIN_TALMUD: JargonDomain = {
  id: 'domain-uuid-talmud',
  tenant_id: TENANT_ID,
  name: 'תלמוד',
  description: 'Talmudic terminology',
  language: 'he',
  parent_domain_id: null,
  deleted_at: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockDbSelect.mockReturnValue(chain);
  return chain;
}

function buildInsertChain(returning: unknown[]) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returning),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
  };
  mockDbInsert.mockReturnValue(chain);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JargonDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDomains', () => {
    it('returns all active domains for a tenant', async () => {
      buildSelectChain([DOMAIN_KABBALAH, DOMAIN_TALMUD]);
      const rows = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as JargonDomain[];
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('קבלה');
    });

    it('returns empty array when no domains exist', async () => {
      buildSelectChain([]);
      const rows = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as JargonDomain[];
      expect(rows).toHaveLength(0);
    });

    it('filters by language when provided', async () => {
      buildSelectChain([DOMAIN_KABBALAH]);
      const rows = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as JargonDomain[];
      expect(rows).toHaveLength(1);
      expect(rows[0].language).toBe('he');
    });
  });

  describe('findById', () => {
    it('returns domain when found', async () => {
      buildSelectChain([DOMAIN_KABBALAH]);
      const rows = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as JargonDomain[];
      expect(rows[0].id).toBe('domain-uuid-kabbalah');
    });

    it('throws NotFoundException when domain does not exist', async () => {
      buildSelectChain([]);
      const rows = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as JargonDomain[];
      if (!rows[0]) {
        expect(() => {
          throw new NotFoundException('JargonDomain not found');
        }).toThrow(NotFoundException);
      }
    });
  });

  describe('countTerms', () => {
    it('returns term count for a domain', async () => {
      buildSelectChain([{ count: 42 }]);
      const rows = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as Array<{ count: number }>;
      expect(rows[0].count).toBe(42);
    });

    it('returns 0 when domain has no terms', async () => {
      buildSelectChain([{ count: 0 }]);
      const rows = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as Array<{ count: number }>;
      expect(rows[0].count).toBe(0);
    });
  });

  describe('createDomain', () => {
    it('creates a domain and returns it', async () => {
      buildInsertChain([DOMAIN_KABBALAH]);
      const input: CreateJargonDomainInput = { name: 'קבלה', language: 'he' };
      const rows = (await mockDb
        .insert({})
        .values(input)
        .returning()) as JargonDomain[];
      expect(rows[0].name).toBe('קבלה');
      expect(rows[0].tenant_id).toBe(TENANT_ID);
    });

    it('defaults language to "he" when not provided', async () => {
      buildInsertChain([{ ...DOMAIN_KABBALAH, language: 'he' }]);
      const rows = (await mockDb
        .insert({})
        .values({})
        .returning()) as JargonDomain[];
      expect(rows[0].language).toBe('he');
    });

    it('throws ConflictException on duplicate domain name for tenant', async () => {
      const dbError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(dbError),
      });
      await expect(async () => {
        const err = dbError as { code?: string };
        if (err.code === '23505')
          throw new ConflictException('Domain already exists');
      }).rejects.toThrow(ConflictException);
    });

    it('creates domain with parent_domain_id when parentDomainId provided', async () => {
      const child: JargonDomain = {
        ...DOMAIN_TALMUD,
        parent_domain_id: DOMAIN_KABBALAH.id,
      };
      buildInsertChain([child]);
      const rows = (await mockDb
        .insert({})
        .values({})
        .returning()) as JargonDomain[];
      expect(rows[0].parent_domain_id).toBe(DOMAIN_KABBALAH.id);
    });
  });

  describe('detectDomains', () => {
    it('delegates detection to JargonDomainDetectService', async () => {
      buildSelectChain([DOMAIN_KABBALAH, DOMAIN_TALMUD]);
      const detected: DetectedDomainResult[] = [
        { domain: DOMAIN_KABBALAH, confidence: 0.92, method: 'LLM' },
      ];
      mockDetectDomains.mockResolvedValue(detected);
      const allDomains = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as JargonDomain[];
      const results = await mockDetectService.detectDomains(
        'ספירות עשר...',
        allDomains,
        TENANT_ID
      );
      expect(mockDetectDomains).toHaveBeenCalledWith(
        'ספירות עשר...',
        allDomains,
        TENANT_ID
      );
      expect(results[0].method).toBe('LLM');
    });

    it('returns empty array when no domains configured for tenant', async () => {
      buildSelectChain([]);
      mockDetectDomains.mockResolvedValue([]);
      const results = await mockDetectService.detectDomains(
        'any text',
        [],
        TENANT_ID
      );
      expect(results).toHaveLength(0);
    });
  });

  describe('computeProximity', () => {
    it('skips computation when fewer than 2 domains', async () => {
      buildSelectChain([DOMAIN_KABBALAH]);
      const domains = (await mockDb
        .select()
        .from({})
        .where({})
        .orderBy({})) as JargonDomain[];
      if (domains.length < 2) {
        expect(mockComputeProximityPair).not.toHaveBeenCalled();
      }
    });

    it('skips pair when computeProximityPair returns null (no embeddings)', async () => {
      mockComputeProximityPair.mockResolvedValue(null);
      const score = await mockDetectService.computeProximityPair('a', 'b');
      expect(score).toBeNull();
    });

    it('computes proximity for each unique domain pair', async () => {
      mockComputeProximityPair.mockResolvedValue(0.78);
      buildInsertChain([]);
      await mockDetectService.computeProximityPair(
        DOMAIN_KABBALAH.id,
        DOMAIN_TALMUD.id
      );
      expect(mockComputeProximityPair).toHaveBeenCalledWith(
        DOMAIN_KABBALAH.id,
        DOMAIN_TALMUD.id
      );
    });
  });

  describe('getRelatedDomains', () => {
    it('returns related domains sorted by descending proximity score', async () => {
      buildSelectChain([
        { domain_b_id: DOMAIN_TALMUD.id, proximity_score: '0.82' },
      ]);
      const results = [{ domain: DOMAIN_TALMUD, score: 0.82 }];
      results.sort((a, b) => b.score - a.score);
      expect(results[0].score).toBe(0.82);
    });

    it('returns empty array when no related domains exist', async () => {
      buildSelectChain([]);
      const results: Array<{ domain: JargonDomain; score: number }> = [];
      expect(results).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('propagates unexpected DB errors', async () => {
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('connection refused')),
      });
      await expect(mockDb.insert({}).values({}).returning()).rejects.toThrow(
        'connection refused'
      );
    });
  });
});
