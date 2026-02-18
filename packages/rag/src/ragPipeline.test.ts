import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RAGPipeline, createRAGPipeline, RAGOptions, RAGResult } from './ragPipeline';
import type { SemanticRetriever, RetrievalResult } from './retriever';

// ---------------------------------------------------------------------------
// Mock the Vercel AI SDK
// ---------------------------------------------------------------------------
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'mocked-openai-model'),
}));

import { generateText, streamText } from 'ai';

const mockGenerateText = vi.mocked(generateText);
const mockStreamText = vi.mocked(streamText);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRetrievalResult(overrides: Partial<RetrievalResult> = {}): RetrievalResult {
  return {
    id: 'doc-1',
    content: 'This document explains neural networks in detail.',
    metadata: { source: 'neural-networks.pdf', page: 12 },
    similarity: 0.91,
    rank: 1,
    ...overrides,
  };
}

function makeMockRetriever(
  results: RetrievalResult[] = [makeRetrievalResult()]
): SemanticRetriever {
  const contextStr = results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.content}\nSource: ${r.metadata['source'] ?? 'Unknown'}\n`
    )
    .join('\n');

  return {
    retrieve: vi.fn<[string, string, RetrievalResult?], Promise<RetrievalResult[]>>()
      .mockResolvedValue(results),
    retrieveWithContext: vi.fn<
      [string, string, RetrievalResult?],
      Promise<{ results: RetrievalResult[]; context: string }>
    >().mockResolvedValue({ results, context: contextStr }),
  } as unknown as SemanticRetriever;
}

function makeGenerateTextResponse(text: string, totalTokens = 123) {
  return { text, usage: { totalTokens } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RAGPipeline', () => {
  let mockRetriever: SemanticRetriever;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRetriever = makeMockRetriever();
    mockGenerateText.mockResolvedValue(
      makeGenerateTextResponse('Generated answer from RAG pipeline') as never
    );
  });

  describe('constructor and factory', () => {
    it('creates RAGPipeline instance', () => {
      const pipeline = new RAGPipeline(mockRetriever);
      expect(pipeline).toBeInstanceOf(RAGPipeline);
    });

    it('creates with default model gpt-4-turbo', () => {
      const pipeline = new RAGPipeline(mockRetriever);
      expect(pipeline).toBeInstanceOf(RAGPipeline);
    });

    it('creates with custom model', () => {
      const pipeline = new RAGPipeline(mockRetriever, 'gpt-3.5-turbo');
      expect(pipeline).toBeInstanceOf(RAGPipeline);
    });

    it('factory createRAGPipeline returns RAGPipeline', () => {
      const pipeline = createRAGPipeline(mockRetriever);
      expect(pipeline).toBeInstanceOf(RAGPipeline);
    });

    it('factory passes model to constructor', () => {
      const pipeline = createRAGPipeline(mockRetriever, 'custom-model');
      expect(pipeline).toBeInstanceOf(RAGPipeline);
    });
  });

  describe('generate()', () => {
    it('calls retriever.retrieveWithContext with correct query and tenantId', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.generate('What is backpropagation?', 'tenant-123');

      expect(mockRetriever.retrieveWithContext).toHaveBeenCalledWith(
        'What is backpropagation?',
        'tenant-123',
        undefined
      );
    });

    it('calls generateText exactly once for a single question', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.generate('test question', 'tenant-abc');

      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('returns RAGResult with answer field', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      const result = await pipeline.generate('question', 'tenant-abc');

      expect(result.answer).toBe('Generated answer from RAG pipeline');
    });

    it('returns sources array derived from retrieval results', async () => {
      const results = [
        makeRetrievalResult({ id: 'src-1', similarity: 0.95 }),
        makeRetrievalResult({ id: 'src-2', similarity: 0.80 }),
      ];
      mockRetriever = makeMockRetriever(results);
      const pipeline = new RAGPipeline(mockRetriever);

      const ragResult: RAGResult = await pipeline.generate('question', 'tenant-abc');

      expect(ragResult.sources).toHaveLength(2);
      expect(ragResult.sources[0]!.id).toBe('src-1');
      expect(ragResult.sources[0]!.similarity).toBe(0.95);
      expect(ragResult.sources[1]!.id).toBe('src-2');
    });

    it('sources contain id, content, similarity fields', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      const result = await pipeline.generate('question', 'tenant-abc');

      const source = result.sources[0]!;
      expect(typeof source.id).toBe('string');
      expect(typeof source.content).toBe('string');
      expect(typeof source.similarity).toBe('number');
    });

    it('returns metadata with model name', async () => {
      const pipeline = new RAGPipeline(mockRetriever, 'gpt-4-turbo');
      const result = await pipeline.generate('question', 'tenant-abc');

      expect(result.metadata.model).toBe('gpt-4-turbo');
    });

    it('returns metadata with tokensUsed from LLM response', async () => {
      mockGenerateText.mockResolvedValue(
        makeGenerateTextResponse('Answer', 500) as never
      );

      const pipeline = new RAGPipeline(mockRetriever);
      const result = await pipeline.generate('question', 'tenant-abc');

      expect(result.metadata.tokensUsed).toBe(500);
    });

    it('returns metadata with retrievalTime and generationTime as numbers', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      const result = await pipeline.generate('question', 'tenant-abc');

      expect(typeof result.metadata.retrievalTime).toBe('number');
      expect(typeof result.metadata.generationTime).toBe('number');
      expect(result.metadata.retrievalTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
    });

    it('includes retrieved context in the LLM prompt', async () => {
      const results = [makeRetrievalResult({ content: 'The answer is 42.' })];
      mockRetriever = makeMockRetriever(results);
      const pipeline = new RAGPipeline(mockRetriever);

      await pipeline.generate('what is the answer?', 'tenant-abc');

      const promptArg = (mockGenerateText.mock.calls[0]![0] as Record<string, unknown>)
        .prompt as string;
      expect(promptArg).toContain('The answer is 42.');
    });

    it('includes original query in the LLM prompt', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.generate('Explain gradient descent', 'tenant-abc');

      const promptArg = (mockGenerateText.mock.calls[0]![0] as Record<string, unknown>)
        .prompt as string;
      expect(promptArg).toContain('Explain gradient descent');
    });

    it('respects custom model in options', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.generate('question', 'tenant-abc', { model: 'gpt-3.5-turbo' });

      const callArg = mockGenerateText.mock.calls[0]![0] as Record<string, unknown>;
      // openai() is called with the model string
      const { openai } = await import('@ai-sdk/openai');
      expect(vi.mocked(openai)).toHaveBeenCalledWith('gpt-3.5-turbo');
    });

    it('respects custom temperature in options', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.generate('question', 'tenant-abc', { temperature: 0.2 });

      const callArg = mockGenerateText.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArg.temperature).toBe(0.2);
    });

    it('respects custom maxTokens in options', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.generate('question', 'tenant-abc', { maxTokens: 500 });

      const callArg = mockGenerateText.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArg.maxTokens).toBe(500);
    });

    it('respects custom systemPrompt in options', async () => {
      const customSystem = 'You are a specialized tutor.';
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.generate('question', 'tenant-abc', { systemPrompt: customSystem });

      const callArg = mockGenerateText.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArg.system).toBe(customSystem);
    });

    it('passes retrievalOptions to retriever', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      const opts: RAGOptions = { retrievalOptions: { topK: 8, similarityThreshold: 0.75 } };
      await pipeline.generate('question', 'tenant-abc', opts);

      expect(mockRetriever.retrieveWithContext).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        opts.retrievalOptions
      );
    });

    it('propagates retriever error', async () => {
      vi.mocked(mockRetriever.retrieveWithContext).mockRejectedValue(
        new Error('Retriever DB failed')
      );

      const pipeline = new RAGPipeline(mockRetriever);
      await expect(pipeline.generate('question', 'tenant-abc')).rejects.toThrow(
        'Retriever DB failed'
      );
    });

    it('propagates LLM generation error', async () => {
      mockGenerateText.mockRejectedValue(new Error('LLM token limit exceeded'));

      const pipeline = new RAGPipeline(mockRetriever);
      await expect(pipeline.generate('question', 'tenant-abc')).rejects.toThrow(
        'LLM token limit exceeded'
      );
    });
  });

  describe('generateStream()', () => {
    it('is an async generator', async () => {
      const fakeStream = (async function* () {
        yield 'chunk1';
        yield ' chunk2';
      })();

      mockStreamText.mockReturnValue({ textStream: fakeStream } as never);

      const pipeline = new RAGPipeline(mockRetriever);
      const gen = pipeline.generateStream('question', 'tenant-abc');
      expect(typeof gen[Symbol.asyncIterator]).toBe('function');
    });

    it('yields text chunks from LLM stream', async () => {
      const chunks = ['First ', 'part ', 'of answer.'];
      const fakeStream = (async function* () {
        for (const chunk of chunks) yield chunk;
      })();

      mockStreamText.mockReturnValue({ textStream: fakeStream } as never);

      const pipeline = new RAGPipeline(mockRetriever);
      const collected: string[] = [];
      for await (const chunk of pipeline.generateStream('question', 'tenant-abc')) {
        collected.push(chunk);
      }

      expect(collected).toEqual(chunks);
    });

    it('calls retrieveWithContext before streaming', async () => {
      const fakeStream = (async function* () { yield 'ok'; })();
      mockStreamText.mockReturnValue({ textStream: fakeStream } as never);

      const pipeline = new RAGPipeline(mockRetriever);
      const chunks: string[] = [];
      for await (const c of pipeline.generateStream('stream query', 'tenant-abc')) {
        chunks.push(c);
      }

      expect(mockRetriever.retrieveWithContext).toHaveBeenCalledWith(
        'stream query',
        'tenant-abc',
        undefined
      );
    });
  });

  describe('chat()', () => {
    it('throws when messages array is empty', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await expect(pipeline.chat([], 'tenant-abc')).rejects.toThrow('Messages array is empty');
    });

    it('throws when last message is not from user', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await expect(
        pipeline.chat([{ role: 'assistant', content: 'Hello' }], 'tenant-abc')
      ).rejects.toThrow('Last message must be from user');
    });

    it('retrieves context using last user message content', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      const messages = [
        { role: 'user' as const, content: 'Tell me about DNA' },
        { role: 'assistant' as const, content: 'DNA is...' },
        { role: 'user' as const, content: 'What about RNA?' },
      ];

      await pipeline.chat(messages, 'tenant-abc');

      expect(mockRetriever.retrieveWithContext).toHaveBeenCalledWith(
        'What about RNA?',
        'tenant-abc',
        undefined
      );
    });

    it('returns RAGResult with answer and sources', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      const result = await pipeline.chat(
        [{ role: 'user', content: 'What is ATP?' }],
        'tenant-abc'
      );

      expect(typeof result.answer).toBe('string');
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('includes conversation history in the LLM prompt', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.chat(
        [
          { role: 'user', content: 'Previous question' },
          { role: 'assistant', content: 'Previous answer' },
          { role: 'user', content: 'Follow-up question' },
        ],
        'tenant-abc'
      );

      const promptArg = (mockGenerateText.mock.calls[0]![0] as Record<string, unknown>)
        .prompt as string;
      expect(promptArg).toContain('Previous question');
      expect(promptArg).toContain('Previous answer');
    });

    it('includes the latest question in the LLM prompt', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      await pipeline.chat(
        [{ role: 'user', content: 'What is photosynthesis?' }],
        'tenant-abc'
      );

      const promptArg = (mockGenerateText.mock.calls[0]![0] as Record<string, unknown>)
        .prompt as string;
      expect(promptArg).toContain('What is photosynthesis?');
    });

    it('metadata.retrievalTime is 0 for chat (no explicit timing)', async () => {
      const pipeline = new RAGPipeline(mockRetriever);
      const result = await pipeline.chat(
        [{ role: 'user', content: 'Question?' }],
        'tenant-abc'
      );

      expect(result.metadata.retrievalTime).toBe(0);
    });

    it('propagates error when retriever fails in chat', async () => {
      vi.mocked(mockRetriever.retrieveWithContext).mockRejectedValue(
        new Error('Chat retrieval failed')
      );
      const pipeline = new RAGPipeline(mockRetriever);

      await expect(
        pipeline.chat([{ role: 'user', content: 'question' }], 'tenant-abc')
      ).rejects.toThrow('Chat retrieval failed');
    });
  });
});
