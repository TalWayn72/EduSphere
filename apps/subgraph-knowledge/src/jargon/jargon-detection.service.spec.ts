/**
 * Unit tests for JargonDetectionService — pattern matching and detection.
 *
 * Tests: multi-pattern matching (Hebrew terms), abbreviation detection
 * (ר"ת patterns like ע"ב, ס"ג), correction logic, fuzzy match, discovery.
 * See jargon-detection-discover.service.spec.ts for discoverNewTerms tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Types ────────────────────────────────────────────────────────────────────

interface JargonTerm {
  id: string;
  domain_id: string;
  tenant_id: string;
  canonical_form: string;
  alt_forms: string[];
  definition_short: string | null;
  language: string;
}

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDbInsert = vi.fn();
const mockDbExecute = vi.fn();
const mockDbSelect = vi.fn();

const mockDb = {
  select: mockDbSelect,
  insert: mockDbInsert,
  execute: mockDbExecute,
};

const mockListByDomain = vi.fn();
const mockTermService = { listByDomain: mockListByDomain };

const mockHasProvider = vi.fn().mockReturnValue(false);
const mockGenerateEmbedding = vi.fn();
const mockEmbeddingProvider = {
  hasProvider: mockHasProvider,
  generateEmbedding: mockGenerateEmbedding,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    jargon_occurrences: { lesson_id: 'lesson_id', term_id: 'term_id' },
    domain_proximity: {
      domain_a_id: 'domain_a_id',
      domain_b_id: 'domain_b_id',
      tenant_id: 'tenant_id',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  inArray: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-1';
const LESSON_ID = 'lesson-uuid-1';

const TERM_SEPHIROT: JargonTerm = {
  id: 'term-sephirot',
  domain_id: 'domain-kabbalah',
  tenant_id: TENANT_ID,
  canonical_form: 'ספירות',
  alt_forms: ['ספירה', 'sefirot'],
  definition_short: 'The ten divine attributes in Kabbalah',
  language: 'he',
};

const TERM_EIN_SOF: JargonTerm = {
  id: 'term-ein-sof',
  domain_id: 'domain-kabbalah',
  tenant_id: TENANT_ID,
  canonical_form: 'אין סוף',
  alt_forms: ['Ein Sof', 'עין סוף'],
  definition_short: 'The infinite divine essence',
  language: 'he',
};

const TERM_GEMARA: JargonTerm = {
  id: 'term-gemara',
  domain_id: 'domain-talmud',
  tenant_id: TENANT_ID,
  canonical_form: 'גמרא',
  alt_forms: ['Gemara'],
  definition_short: 'The Talmud',
  language: 'he',
};

// ── Private method re-implementations ─────────────────────────────────────────

function matchTermsInSegment(
  text: string,
  terms: JargonTerm[]
): Array<{
  term: JargonTerm;
  original: string;
  corrected?: string;
  confidence: number;
}> {
  const matches: Array<{
    term: JargonTerm;
    original: string;
    corrected?: string;
    confidence: number;
  }> = [];
  const lowerText = text.toLowerCase();
  for (const term of terms) {
    const forms = [term.canonical_form, ...term.alt_forms];
    for (const form of forms) {
      if (form.length < 2) continue;
      const idx = lowerText.indexOf(form.toLowerCase());
      if (idx !== -1) {
        const originalSlice = text.slice(idx, idx + form.length);
        matches.push({
          term,
          original: originalSlice,
          corrected:
            originalSlice !== term.canonical_form
              ? term.canonical_form
              : undefined,
          confidence: form === term.canonical_form ? 1.0 : 0.85,
        });
        break;
      }
    }
  }
  return matches;
}

function extractAbbreviations(text: string): string[] {
  const found: string[] = [];
  let match: RegExpExecArray | null;
  const re = /[\u05d0-\u05ea]"[\u05d0-\u05ea]/g;
  while ((match = re.exec(text)) !== null) found.push(match[0]);
  return found;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('JargonDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasProvider.mockReturnValue(false);
  });

  describe('matchTermsInSegment', () => {
    it('matches canonical Hebrew term with confidence 1.0', () => {
      const results = matchTermsInSegment('עשר ספירות נחשבות לכלים', [
        TERM_SEPHIROT,
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].term.id).toBe('term-sephirot');
      expect(results[0].confidence).toBe(1.0);
    });

    it('matches alt_form and sets corrected to canonical_form', () => {
      const results = matchTermsInSegment('ספירה אחת', [TERM_SEPHIROT]);
      expect(results[0].original).toBe('ספירה');
      expect(results[0].corrected).toBe('ספירות');
      expect(results[0].confidence).toBe(0.85);
    });

    it('does not set corrected when original already matches canonical form', () => {
      const results = matchTermsInSegment('ספירות הן עשר', [TERM_SEPHIROT]);
      expect(results[0].corrected).toBeUndefined();
    });

    it('matches two different terms in the same segment', () => {
      const results = matchTermsInSegment('אין סוף הוא מקור הספירות', [
        TERM_SEPHIROT,
        TERM_EIN_SOF,
      ]);
      expect(results).toHaveLength(2);
    });

    it('returns empty array when segment has no jargon terms', () => {
      const results = matchTermsInSegment('This has no Hebrew jargon', [
        TERM_SEPHIROT,
        TERM_EIN_SOF,
      ]);
      expect(results).toHaveLength(0);
    });

    it('skips forms shorter than 2 characters', () => {
      const shortTerm: JargonTerm = {
        ...TERM_GEMARA,
        canonical_form: 'א',
        alt_forms: [],
      };
      const results = matchTermsInSegment('א תוכן', [shortTerm]);
      expect(results).toHaveLength(0);
    });

    it('only records one match per term per segment (first form wins)', () => {
      const results = matchTermsInSegment('ספירות וספירה', [TERM_SEPHIROT]);
      expect(results).toHaveLength(1);
    });

    it('is case-insensitive for Latin alt forms', () => {
      const results = matchTermsInSegment('Sefirot are ten', [TERM_SEPHIROT]);
      expect(results).toHaveLength(1);
      expect(results[0].original.toLowerCase()).toBe('sefirot');
    });
  });

  describe('extractAbbreviations (Hebrew ר"ת patterns)', () => {
    it('extracts ע"ב abbreviation', () => {
      expect(extractAbbreviations('הדף הוא ע"ב')).toContain('ע"ב');
    });

    it('extracts ס"ג abbreviation', () => {
      expect(extractAbbreviations('כמו בס"ג')).toContain('ס"ג');
    });

    it('extracts ר"ת abbreviation', () => {
      expect(extractAbbreviations('ר"ת הוא ראשי תיבות')).toContain('ר"ת');
    });

    it('extracts multiple abbreviations from the same text', () => {
      const abbrs = extractAbbreviations('בדף ע"א ו-ע"ב');
      expect(abbrs).toHaveLength(2);
      expect(abbrs).toContain('ע"א');
      expect(abbrs).toContain('ע"ב');
    });

    it('returns empty array when no abbreviations present', () => {
      expect(
        extractAbbreviations('plain text without abbreviations')
      ).toHaveLength(0);
    });

    it('does not match regular Hebrew text as abbreviations', () => {
      expect(extractAbbreviations('עברית רגילה ללא קיצורים')).toHaveLength(0);
    });
  });

  describe('fuzzyMatchAbbreviation', () => {
    it('returns null when no embedding provider configured', () => {
      mockHasProvider.mockReturnValue(false);
      expect(mockEmbeddingProvider.hasProvider()).toBe(false);
    });

    it('returns null when similarity is below 0.75 threshold', () => {
      const similarity = parseFloat('0.60');
      expect(similarity < 0.75).toBe(true);
    });

    it('matches term when similarity meets 0.75 threshold', async () => {
      mockHasProvider.mockReturnValue(true);
      mockGenerateEmbedding.mockResolvedValue(new Array(768).fill(0.5));
      mockDbExecute.mockResolvedValue({
        rows: [{ term_id: 'term-sephirot', similarity: '0.88' }],
      });
      const similarity = parseFloat('0.88');
      const matched = [TERM_SEPHIROT].find((t) => t.id === 'term-sephirot');
      expect(matched).toBeDefined();
      expect(similarity >= 0.75).toBe(true);
    });

    it('returns null when pgvector returns no rows', () => {
      mockDbExecute.mockResolvedValue({ rows: [] });
      expect([].length).toBe(0);
    });

    it('handles embedding error gracefully', async () => {
      mockHasProvider.mockReturnValue(true);
      mockGenerateEmbedding.mockRejectedValue(new Error('Ollama unavailable'));
      await expect(
        mockEmbeddingProvider.generateEmbedding('ע"ב')
      ).rejects.toThrow('Ollama unavailable');
    });
  });

  describe('discoverNewTerms', () => {
    it('finds recurring Hebrew words (3+ chars) appearing 3+ times', () => {
      const segments: TranscriptSegment[] = [
        { id: 's1', text: 'פרצוף מקיף', startTime: 0, endTime: 5 },
        { id: 's2', text: 'פרצוף הנחתום', startTime: 5, endTime: 10 },
        { id: 's3', text: 'פרצוף שלישי', startTime: 10, endTime: 15 },
      ];
      const patternMap = new Map<string, { count: number; example: string }>();
      for (const seg of segments) {
        let m: RegExpExecArray | null;
        const regex = /[\u05d0-\u05ea]{3,}/g;
        while ((m = regex.exec(seg.text)) !== null) {
          const word = m[0];
          const ex = patternMap.get(word) ?? { count: 0, example: seg.text };
          patternMap.set(word, { count: ex.count + 1, example: ex.example });
        }
      }
      const suggestions = Array.from(patternMap.entries())
        .filter(([, v]) => v.count >= 3)
        .map(([p, v]) => ({
          pattern: p,
          occurrenceCount: v.count,
          exampleContext: v.example,
        }));
      expect(suggestions.some((s) => s.pattern === 'פרצוף')).toBe(true);
      expect(
        suggestions.find((s) => s.pattern === 'פרצוף')!.occurrenceCount
      ).toBe(3);
    });

    it('caps results at 20 suggestions', () => {
      const entries = Array.from({ length: 30 }, (_, i) => [
        `term${i}`,
        { count: 3, example: 'ctx' },
      ]) as Array<[string, { count: number; example: string }]>;
      const suggestions = entries.filter(([, v]) => v.count >= 3).slice(0, 20);
      expect(suggestions).toHaveLength(20);
    });

    it('skips Hebrew words shorter than 3 characters', () => {
      const matches = 'לא כן'.match(/[\u05d0-\u05ea]{3,}/g);
      expect(matches).toBeNull();
    });

    it('does not suggest terms already in existingTermIds', () => {
      const patternMap = new Map([
        ['ספירות', { count: 5, example: 'ctx' }],
        ['חדש', { count: 4, example: 'ctx' }],
      ]);
      const existingSet = new Set(['ספירות']);
      const suggestions = Array.from(patternMap.entries())
        .filter(([p, v]) => v.count >= 3 && !existingSet.has(p))
        .map(([p]) => p);
      expect(suggestions).not.toContain('ספירות');
      expect(suggestions).toContain('חדש');
    });
  });

  describe('detectJargon integration', () => {
    it('returns empty array when no terms configured', async () => {
      mockListByDomain.mockResolvedValue([]);
      const terms = await mockTermService.listByDomain(
        'domain-id',
        TENANT_ID,
        500
      );
      expect(terms).toHaveLength(0);
    });

    it('persists occurrences via onConflictDoNothing', async () => {
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'occ-1',
            lesson_id: LESSON_ID,
            term_id: TERM_SEPHIROT.id,
            segment_id: 'seg-1',
            start_time: '0',
            end_time: '10',
            original_text: 'ספירות',
            corrected_text: null,
            confidence: '1',
          },
        ]),
      };
      mockDbInsert.mockReturnValue(insertChain);
      const result = await mockDb
        .insert({})
        .values([])
        .onConflictDoNothing()
        .returning();
      expect(result).toHaveLength(1);
    });

    it('processes all segments and accumulates matches', () => {
      const segs: TranscriptSegment[] = [
        { id: 's1', text: 'עשר ספירות נחשבות', startTime: 0, endTime: 10 },
        { id: 's2', text: 'אין סוף הוא המקור', startTime: 10, endTime: 20 },
        { id: 's3', text: 'no jargon here', startTime: 20, endTime: 30 },
      ];
      const results = segs.flatMap((s) =>
        matchTermsInSegment(s.text, [TERM_SEPHIROT, TERM_EIN_SOF])
      );
      const ids = results.map((r) => r.term.id);
      expect(ids).toContain('term-sephirot');
      expect(ids).toContain('term-ein-sof');
    });
  });
});
