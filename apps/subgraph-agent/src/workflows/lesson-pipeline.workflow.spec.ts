import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock ai SDK ─────────────────────────────────────────────────────────────

const mockGenerateText = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import {
  runLessonPipeline,
  type LessonPipelineInput,
  type CitationSearchFn,
} from './lesson-pipeline.workflow';
import type { LanguageModel } from 'ai';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockModel = { modelId: 'test-model' } as unknown as LanguageModel;

function makeInput(
  overrides: Partial<LessonPipelineInput> = {}
): LessonPipelineInput {
  return {
    prompt: 'Teach about Talmudic hermeneutics',
    archetype: 'THEMATIC',
    language: 'he',
    maxCitations: 3,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('runLessonPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('happy path', () => {
    it('runs all 6 stages and returns COMPLETE result', async () => {
      // parsePrompt → fetchCitations (no LLM) → generateOutline → enrichWithGraph (no LLM)
      // → verifyHebrew (no LLM) → exportMarkdown
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Talmudic Hermeneutics' }) // parsePrompt
        .mockResolvedValueOnce({ text: '# Section 1\n## Point A' }) // generateOutline
        .mockResolvedValueOnce({ text: '# Full Lesson Content' }); // exportMarkdown

      const result = await runLessonPipeline(makeInput(), mockModel, 'exec-1');

      expect(result.status).toBe('COMPLETE');
      expect(result.executionId).toBe('exec-1');
      expect(result.markdownContent).toBe('# Full Lesson Content');
      expect(result.stage).toBe('done');
      expect(mockGenerateText).toHaveBeenCalledTimes(3);
    });

    it('includes citations when searchFn is provided', async () => {
      const searchFn: CitationSearchFn = vi.fn().mockResolvedValue([
        {
          id: 'ref-1',
          text: 'Citation text',
          similarity: 0.9,
          source: 'Talmud',
        },
        { id: 'ref-2', text: 'Another citation', similarity: 0.8 },
      ]);

      mockGenerateText
        .mockResolvedValueOnce({ text: 'Topic Name' })
        .mockResolvedValueOnce({ text: '# Outline' })
        .mockResolvedValueOnce({ text: '# Final Lesson' });

      const result = await runLessonPipeline(
        makeInput(),
        mockModel,
        'exec-2',
        searchFn
      );

      expect(result.status).toBe('COMPLETE');
      expect(result.citations).toHaveLength(2);
      expect(result.citations[0]).toContain('ref-1');
      expect(searchFn).toHaveBeenCalledWith('Topic Name', 3);
    });

    it('returns empty citations when no searchFn provided', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Topic' })
        .mockResolvedValueOnce({ text: '# Outline' })
        .mockResolvedValueOnce({ text: '# Content' });

      const result = await runLessonPipeline(makeInput(), mockModel, 'exec-3');

      expect(result.citations).toEqual([]);
    });

    it('supports SEQUENTIAL archetype', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Sequential Topic' })
        .mockResolvedValueOnce({ text: '# Sequential Outline' })
        .mockResolvedValueOnce({ text: '# Sequential Content' });

      const result = await runLessonPipeline(
        makeInput({ archetype: 'SEQUENTIAL' }),
        mockModel,
        'exec-4'
      );

      expect(result.status).toBe('COMPLETE');
      // Verify the outline generation prompt included SEQUENTIAL archetype
      const outlineCall = mockGenerateText.mock.calls[1][0];
      expect(outlineCall.messages[0].content).toContain('SEQUENTIAL');
    });
  });

  describe('error handling', () => {
    it('returns FAILED status when parsePrompt throws', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('LLM timeout'));

      const result = await runLessonPipeline(
        makeInput(),
        mockModel,
        'exec-err-1'
      );

      expect(result.status).toBe('FAILED');
      expect(result.markdownContent).toBeNull();
      expect(result.stage).toBe('parsePrompt');
    });

    it('returns FAILED with stage=generateOutline when outline fails', async () => {
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Topic' }) // parsePrompt OK
        .mockRejectedValueOnce(new Error('rate limit')); // generateOutline fails

      const result = await runLessonPipeline(
        makeInput(),
        mockModel,
        'exec-err-2'
      );

      expect(result.status).toBe('FAILED');
      expect(result.stage).toBe('generateOutline');
    });

    it('returns empty citations on searchFn failure', async () => {
      const searchFn: CitationSearchFn = vi
        .fn()
        .mockRejectedValue(new Error('pgvector down'));

      mockGenerateText
        .mockResolvedValueOnce({ text: 'Topic' })
        .mockResolvedValueOnce({ text: '# Outline' })
        .mockResolvedValueOnce({ text: '# Content' });

      const result = await runLessonPipeline(
        makeInput(),
        mockModel,
        'exec-err-3',
        searchFn
      );

      expect(result.status).toBe('COMPLETE');
      expect(result.citations).toEqual([]);
    });
  });

  describe('hebrewNerEntities', () => {
    it('returns citation references as entities', async () => {
      const searchFn: CitationSearchFn = vi.fn().mockResolvedValue([
        { id: 'ref-A', text: 'text A', similarity: 0.9 },
        { id: 'ref-B', text: 'text B', similarity: 0.8 },
      ]);

      mockGenerateText
        .mockResolvedValueOnce({ text: 'Topic' })
        .mockResolvedValueOnce({ text: '# Outline' })
        .mockResolvedValueOnce({ text: '# Content' });

      const result = await runLessonPipeline(
        makeInput(),
        mockModel,
        'exec-ner',
        searchFn
      );

      expect(result.hebrewNerEntities).toEqual(['ref-A', 'ref-B']);
    });
  });

  describe('defaults', () => {
    it('uses maxCitations=5 when not specified', async () => {
      const searchFn: CitationSearchFn = vi.fn().mockResolvedValue([]);
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Topic' })
        .mockResolvedValueOnce({ text: '# Outline' })
        .mockResolvedValueOnce({ text: '# Content' });

      await runLessonPipeline(
        makeInput({ maxCitations: undefined }),
        mockModel,
        'exec-def',
        searchFn
      );

      expect(searchFn).toHaveBeenCalledWith('Topic', 5);
    });
  });
});
