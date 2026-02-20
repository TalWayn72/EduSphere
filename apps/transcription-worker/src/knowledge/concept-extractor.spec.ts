import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConceptExtractor } from './concept-extractor';

// Mock Vercel AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'openai-model')),
}));

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => vi.fn(() => 'ollama-model')),
}));

import { generateObject } from 'ai';

const SAMPLE_TEXT =
  'Aristotle was a Greek philosopher who defined metaphysics as the study of being qua being. ' +
  'He distinguished substance from accident and form from matter. His teleological view holds ' +
  'that things have final causes — purposes toward which they naturally strive.';

describe('ConceptExtractor', () => {
  let extractor: ConceptExtractor;

  beforeEach(() => {
    extractor = new ConceptExtractor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_URL;
  });

  it('returns extracted concepts on success', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        concepts: [
          { name: 'Metaphysics', definition: 'Study of being qua being', relatedTerms: ['Ontology'] },
          { name: 'Teleology', definition: 'Study of final causes', relatedTerms: ['Aristotle'] },
        ],
      },
    } as any);

    const result = await extractor.extract(SAMPLE_TEXT, 'course-1', 'tenant-1');

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Metaphysics');
    expect(result[0].definition).toBe('Study of being qua being');
    expect(result[0].relatedTerms).toContain('Ontology');
    expect(result[1].name).toBe('Teleology');
  });

  it('returns empty array when text is shorter than 50 chars', async () => {
    const result = await extractor.extract('Too short', 'course-1', 'tenant-1');
    expect(result).toEqual([]);
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('returns empty array when text is empty string', async () => {
    const result = await extractor.extract('', 'course-1', 'tenant-1');
    expect(result).toEqual([]);
  });

  it('returns empty array and logs error when AI call fails', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('AI service unavailable'));

    const result = await extractor.extract(SAMPLE_TEXT, 'course-1', 'tenant-1');

    expect(result).toEqual([]);
  });

  it('trims whitespace from concept names and definitions', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        concepts: [
          { name: '  Aristotle  ', definition: '  Greek philosopher  ', relatedTerms: [] },
        ],
      },
    } as any);

    const result = await extractor.extract(SAMPLE_TEXT, 'course-1', 'tenant-1');

    expect(result[0].name).toBe('Aristotle');
    expect(result[0].definition).toBe('Greek philosopher');
  });

  it('filters empty strings from relatedTerms', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: {
        concepts: [
          { name: 'Concept', definition: 'A thing', relatedTerms: ['', 'Ontology', '  '] },
        ],
      },
    } as any);

    const result = await extractor.extract(SAMPLE_TEXT, 'course-1', 'tenant-1');

    expect(result[0].relatedTerms).not.toContain('');
    expect(result[0].relatedTerms).toContain('Ontology');
  });

  it('uses OpenAI model when OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const { createOpenAI } = await import('@ai-sdk/openai');

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { concepts: [] },
    } as any);

    await extractor.extract(SAMPLE_TEXT, 'course-1', 'tenant-1');

    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });

  it('uses Ollama model when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.OLLAMA_URL = 'http://ollama:11434';
    const { createOllama } = await import('ollama-ai-provider');

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { concepts: [] },
    } as any);

    await extractor.extract(SAMPLE_TEXT, 'course-1', 'tenant-1');

    expect(createOllama).toHaveBeenCalledWith({ baseURL: 'http://ollama:11434/api' });
  });

  it('truncates long text to 8000 chars', async () => {
    const longText = 'a'.repeat(10000);
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { concepts: [] },
    } as any);

    await extractor.extract(longText, 'course-1', 'tenant-1');

    const callArgs = vi.mocked(generateObject).mock.calls[0][0] as any;
    expect(callArgs.prompt.length).toBeLessThanOrEqual(
      8000 + 'Course ID: course-1\n\nTranscript:\n'.length
    );
  });
});
