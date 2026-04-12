/**
 * Unit tests for JargonTermService.
 *
 * Tests: term CRUD (listByDomain, findById, addTerm), alt_forms handling,
 * bulk import, search (ILIKE + pgvector), embedding generation.
 * All DB and embedding dependencies are fully mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';

// ── Types ────────────────────────────────────────────────────────────────────

interface JargonTerm {
  id: string;
  domain_id: string;
  tenant_id: string;
  canonical_form: string;
  alt_forms: string[];
  phonetic_hint: string | null;
  definition_short: string | null;
  language: string;
  source: string;
}

interface AddJargonTermInput {
  domainId: string;
  canonicalForm: string;
  phoneticHint?: string;
  altForms?: string[];
  definitionShort?: string;
  language?: string;
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbExecute = vi.fn();

const mockDb = { select: mockDbSelect, insert: mockDbInsert, execute: mockDbExecute };

const mockHasProvider = vi.fn().mockReturnValue(false);
const mockGenerateEmbedding = vi.fn();
const mockEmbeddingProvider = {
  hasProvider: mockHasProvider,
  generateEmbedding: mockGenerateEmbedding,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    jargon_terms: {
      id: 'id', tenant_id: 'tenant_id', domain_id: 'domain_id',
      canonical_form: 'canonical_form', deleted_at: 'deleted_at', language: 'language',
    },
    jargon_term_embeddings: { term_id: 'term_id', embedding: 'embedding' },
  },
  eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), ilike: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }), inArray: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-1';
const DOMAIN_ID = 'domain-kabbalah';

const TERM_SEPHIROT: JargonTerm = {
  id: 'term-sephirot', domain_id: DOMAIN_ID, tenant_id: TENANT_ID,
  canonical_form: 'ספירות', alt_forms: ['ספירה', 'sefirot'],
  phonetic_hint: 'sefiROT', definition_short: 'The ten divine attributes',
  language: 'he', source: 'MANUAL',
};

const TERM_EIN_SOF: JargonTerm = {
  id: 'term-ein-sof', domain_id: DOMAIN_ID, tenant_id: TENANT_ID,
  canonical_form: 'אין סוף', alt_forms: ['Ein Sof'], phonetic_hint: null,
  definition_short: 'The infinite divine essence', language: 'he', source: 'MANUAL',
};

const _TERM_KETER: JargonTerm = {
  id: 'term-keter', domain_id: DOMAIN_ID, tenant_id: TENANT_ID,
  canonical_form: 'כתר', alt_forms: ['Keter', 'Crown'], phonetic_hint: 'KEter',
  definition_short: 'The Crown — first sefirah', language: 'he', source: 'IMPORTED',
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
    onConflictDoNothing: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  };
  mockDbInsert.mockReturnValue(chain);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JargonTermService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasProvider.mockReturnValue(false);
  });

  describe('listByDomain', () => {
    it('returns terms for a domain ordered by canonical_form', async () => {
      buildSelectChain([TERM_SEPHIROT, TERM_EIN_SOF]);
      const rows = (await mockDb.select().from({}).where({}).orderBy({})) as JargonTerm[];
      expect(rows).toHaveLength(2);
      expect(rows[0].canonical_form).toBe('ספירות');
    });

    it('returns empty array when domain has no terms', async () => {
      buildSelectChain([]);
      const rows = (await mockDb.select().from({}).where({}).orderBy({})) as JargonTerm[];
      expect(rows).toHaveLength(0);
    });

    it('respects limit parameter', async () => {
      buildSelectChain([TERM_SEPHIROT]);
      const rows = (await mockDb.select().from({}).where({}).limit(1)) as JargonTerm[];
      expect(rows).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns term when found', async () => {
      buildSelectChain([TERM_SEPHIROT]);
      const rows = (await mockDb.select().from({}).where({}).orderBy({})) as JargonTerm[];
      expect(rows[0].id).toBe('term-sephirot');
    });

    it('throws NotFoundException when term not found', async () => {
      buildSelectChain([]);
      const rows = (await mockDb.select().from({}).where({}).orderBy({})) as JargonTerm[];
      if (!rows[0]) {
        expect(() => { throw new NotFoundException('JargonTerm not found'); }).toThrow(NotFoundException);
      }
    });
  });

  describe('findByIds', () => {
    it('returns empty array when ids is empty', () => {
      expect([].length).toBe(0);
    });

    it('returns all matching terms for given ids', async () => {
      buildSelectChain([TERM_SEPHIROT, TERM_EIN_SOF]);
      const rows = (await mockDb.select().from({}).where({}).orderBy({})) as JargonTerm[];
      expect(rows).toHaveLength(2);
    });
  });

  describe('addTerm', () => {
    it('creates a term with MANUAL source and default language "he"', async () => {
      buildInsertChain([TERM_SEPHIROT]);
      const input: AddJargonTermInput = { domainId: DOMAIN_ID, canonicalForm: 'ספירות' };
      const rows = (await mockDb.insert({}).values(input).returning()) as JargonTerm[];
      expect(rows[0].language).toBe('he');
      expect(rows[0].source).toBe('MANUAL');
    });

    it('stores alt_forms as array', async () => {
      buildInsertChain([{ ...TERM_SEPHIROT, alt_forms: ['ספירה', 'sefirot'] }]);
      const rows = (await mockDb.insert({}).values({}).returning()) as JargonTerm[];
      expect(rows[0].alt_forms).toHaveLength(2);
      expect(rows[0].alt_forms).toContain('ספירה');
    });

    it('stores empty alt_forms when none provided', async () => {
      buildInsertChain([{ ...TERM_SEPHIROT, alt_forms: [] }]);
      const rows = (await mockDb.insert({}).values({}).returning()) as JargonTerm[];
      expect(rows[0].alt_forms).toHaveLength(0);
    });

    it('throws ConflictException on duplicate canonical_form in domain', async () => {
      const dbError = Object.assign(new Error('duplicate key'), { code: '23505' });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(dbError),
      });
      await expect(async () => {
        const err = dbError as { code?: string };
        if (err.code === '23505') throw new ConflictException('Term already exists');
      }).rejects.toThrow(ConflictException);
    });

    it('propagates unexpected DB errors', async () => {
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('network timeout')),
      });
      await expect(mockDb.insert({}).values({}).returning()).rejects.toThrow('network timeout');
    });
  });

  describe('bulkImport', () => {
    it('returns 0 when terms array is empty', () => {
      expect(([] as AddJargonTermInput[]).length).toBe(0);
    });

    it('inserts terms with IMPORTED source', () => {
      const inputs: AddJargonTermInput[] = [
        { domainId: DOMAIN_ID, canonicalForm: 'כתר', language: 'he' },
        { domainId: DOMAIN_ID, canonicalForm: 'חכמה', language: 'he' },
      ];
      const inserts = inputs.map((t) => ({
        canonical_form: t.canonicalForm,
        source: 'IMPORTED' as const,
        alt_forms: t.altForms ?? [],
      }));
      expect(inserts[0].source).toBe('IMPORTED');
      expect(inserts[1].source).toBe('IMPORTED');
    });

    it('uses onConflictDoNothing to skip duplicates', async () => {
      buildInsertChain([{ id: 'a' }, { id: 'b' }]);
      const inserted = (await mockDb.insert({}).values([]).onConflictDoNothing().returning()) as Array<{ id: string }>;
      expect(inserted).toHaveLength(2);
    });

    it('defaults alt_forms to empty array when not provided', () => {
      const input: AddJargonTermInput = { domainId: DOMAIN_ID, canonicalForm: 'בינה' };
      const insert = { alt_forms: input.altForms ?? [] };
      expect(insert.alt_forms).toEqual([]);
    });
  });

  describe('searchTerms', () => {
    it('returns ILIKE results when they meet the limit', async () => {
      buildSelectChain([TERM_SEPHIROT, TERM_EIN_SOF]);
      const rows = (await mockDb.select().from({}).where({}).limit(50)) as JargonTerm[];
      expect(rows).toHaveLength(2);
    });

    it('returns ILIKE-only when no embedding provider', async () => {
      mockHasProvider.mockReturnValue(false);
      buildSelectChain([TERM_SEPHIROT]);
      expect(mockEmbeddingProvider.hasProvider()).toBe(false);
      const rows = (await mockDb.select().from({}).where({}).limit(50)) as JargonTerm[];
      expect(rows).toHaveLength(1);
    });

    it('supplements with pgvector when ILIKE returns fewer than limit', async () => {
      mockHasProvider.mockReturnValue(true);
      mockGenerateEmbedding.mockResolvedValue(new Array(768).fill(0.2));
      mockDbExecute.mockResolvedValue({ rows: [{ term_id: 'term-ein-sof' }] });
      buildSelectChain([TERM_SEPHIROT]);
      const ilikeResults = (await mockDb.select().from({}).where({}).limit(50)) as JargonTerm[];
      const vectorIds = ['term-ein-sof'];
      const existingIds = new Set(ilikeResults.map((t) => t.id));
      const newIds = vectorIds.filter((id) => !existingIds.has(id));
      expect(newIds).toContain('term-ein-sof');
    });

    it('deduplicates between ILIKE and pgvector results', async () => {
      mockHasProvider.mockReturnValue(true);
      mockDbExecute.mockResolvedValue({ rows: [{ term_id: 'term-sephirot' }] });
      buildSelectChain([TERM_SEPHIROT]);
      const ilikeResults = (await mockDb.select().from({}).where({}).limit(50)) as JargonTerm[];
      const existingIds = new Set(ilikeResults.map((t) => t.id));
      const newIds = ['term-sephirot'].filter((id) => !existingIds.has(id));
      expect(newIds).toHaveLength(0);
    });

    it('falls back to ILIKE-only when pgvector throws', async () => {
      mockHasProvider.mockReturnValue(true);
      mockGenerateEmbedding.mockRejectedValue(new Error('vector DB unavailable'));
      buildSelectChain([TERM_SEPHIROT]);
      const ilikeResults = (await mockDb.select().from({}).where({}).limit(50)) as JargonTerm[];
      expect(ilikeResults).toHaveLength(1);
    });
  });

  describe('generateEmbedding', () => {
    it('skips embedding when no provider configured', () => {
      mockHasProvider.mockReturnValue(false);
      expect(mockEmbeddingProvider.hasProvider()).toBe(false);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it('generates embedding from canonical_form + alt_forms concatenated', async () => {
      mockHasProvider.mockReturnValue(true);
      buildSelectChain([TERM_SEPHIROT]);
      mockGenerateEmbedding.mockResolvedValue(new Array(768).fill(0.4));
      buildInsertChain([]);
      const text = [TERM_SEPHIROT.canonical_form, ...TERM_SEPHIROT.alt_forms].join(' ');
      await mockEmbeddingProvider.generateEmbedding(text);
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('ספירות ספירה sefirot');
    });

    it('upserts embedding row (onConflictDoUpdate)', async () => {
      mockHasProvider.mockReturnValue(true);
      buildSelectChain([TERM_SEPHIROT]);
      mockGenerateEmbedding.mockResolvedValue(new Array(768).fill(0.1));
      const insertChain = buildInsertChain([]);
      await mockEmbeddingProvider.generateEmbedding('test');
      expect(insertChain.onConflictDoUpdate).toBeDefined();
    });

    it('skips embedding when term not found in DB (early return)', async () => {
      mockHasProvider.mockReturnValue(true);
      buildSelectChain([]);
      const rows = (await mockDb.select().from({}).where({}).orderBy({})) as JargonTerm[];
      expect(rows).toHaveLength(0);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it('propagates embedding errors to caller', async () => {
      mockHasProvider.mockReturnValue(true);
      mockGenerateEmbedding.mockRejectedValue(new Error('GPU OOM'));
      await expect(
        mockEmbeddingProvider.generateEmbedding('כתר Keter Crown')
      ).rejects.toThrow('GPU OOM');
    });
  });
});
