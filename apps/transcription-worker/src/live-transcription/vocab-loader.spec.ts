import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Knowledge client mock ─────────────────────────────────────────────────
const mockDetectLessonDomains = vi.fn();
const mockLoadTermsForDomain = vi.fn();

vi.mock('../jargon/jargon-knowledge-client', () => ({
  detectLessonDomains: (...args: unknown[]) => mockDetectLessonDomains(...args),
  loadTermsForDomain: (...args: unknown[]) => mockLoadTermsForDomain(...args),
}));

import { VocabLoader } from './vocab-loader.js';
import type { TermPayload } from '../jargon/jargon-knowledge-client.js';

const SESSION_ID = 'sess-1';
const LESSON_ID = 'lesson-1';
const TENANT_ID = 'tenant-1';

const sampleTerms: TermPayload[] = [
  { id: 't-1', canonicalForm: 'Ontology', altForms: ['ontology'] },
  { id: 't-2', canonicalForm: 'Epistemology', altForms: ['episteme'] },
];

const sampleDomains = {
  domains: [
    { domain: { id: 'domain-1', name: 'Philosophy', language: 'en' }, confidence: 0.9, method: 'NLP' },
  ],
  suggestedTerms: [],
};

describe('VocabLoader', () => {
  let loader: VocabLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = new VocabLoader();
  });

  describe('getPrompt', () => {
    it('loads terms from knowledge subgraph and builds comma-separated prompt', async () => {
      mockDetectLessonDomains.mockResolvedValue(sampleDomains);
      mockLoadTermsForDomain.mockResolvedValue(sampleTerms);

      const prompt = await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);

      expect(mockDetectLessonDomains).toHaveBeenCalledWith(LESSON_ID, TENANT_ID);
      expect(mockLoadTermsForDomain).toHaveBeenCalledWith('domain-1', TENANT_ID, 50);
      expect(prompt).toContain('Ontology');
      expect(prompt).toContain('Epistemology');
    });

    it('returns empty string when no terms loaded', async () => {
      mockDetectLessonDomains.mockResolvedValue({ domains: [], suggestedTerms: [] });
      const prompt = await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);
      expect(prompt).toBe('');
    });

    it('returns empty string gracefully on empty domains', async () => {
      mockDetectLessonDomains.mockResolvedValue({ domains: [], suggestedTerms: [] });
      mockLoadTermsForDomain.mockResolvedValue([]);
      const prompt = await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);
      expect(prompt).toBe('');
      expect(mockLoadTermsForDomain).not.toHaveBeenCalled();
    });

    it('returns empty string gracefully when knowledge client throws', async () => {
      mockDetectLessonDomains.mockRejectedValue(new Error('network error'));
      const prompt = await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);
      expect(prompt).toBe('');
    });
  });

  describe('caching', () => {
    it('returns cached prompt on second call without re-fetching', async () => {
      mockDetectLessonDomains.mockResolvedValue(sampleDomains);
      mockLoadTermsForDomain.mockResolvedValue(sampleTerms);

      const first = await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);
      const second = await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);

      expect(first).toBe(second);
      expect(mockDetectLessonDomains).toHaveBeenCalledOnce();
    });

    it('re-fetches after cache eviction via evict()', async () => {
      mockDetectLessonDomains.mockResolvedValue(sampleDomains);
      mockLoadTermsForDomain.mockResolvedValue(sampleTerms);

      await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);
      loader.evict(SESSION_ID);
      await loader.getPrompt(SESSION_ID, LESSON_ID, TENANT_ID);

      expect(mockDetectLessonDomains).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTerms', () => {
    it('returns cached terms on second call', async () => {
      mockDetectLessonDomains.mockResolvedValue(sampleDomains);
      mockLoadTermsForDomain.mockResolvedValue(sampleTerms);

      const terms = await loader.getTerms(SESSION_ID, LESSON_ID, TENANT_ID);
      expect(terms).toHaveLength(2);
      expect(terms[0].canonicalForm).toBe('Ontology');

      // Second call — should use cache
      const terms2 = await loader.getTerms(SESSION_ID, LESSON_ID, TENANT_ID);
      expect(terms2).toHaveLength(2);
      expect(mockDetectLessonDomains).toHaveBeenCalledOnce();
    });

    it('returns empty array when domain detection fails', async () => {
      mockDetectLessonDomains.mockRejectedValue(new Error('timeout'));
      const terms = await loader.getTerms(SESSION_ID, LESSON_ID, TENANT_ID);
      expect(terms).toEqual([]);
    });
  });
});
