import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingProviderService } from './embedding-provider.service.js';

describe('EmbeddingProviderService', () => {
  let service: EmbeddingProviderService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    service = new EmbeddingProviderService();
    vi.clearAllMocks();
    // Clear provider env vars before each test
    delete process.env.OLLAMA_URL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.EMBEDDING_MODEL;
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  describe('hasProvider()', () => {
    it('returns false when neither OLLAMA_URL nor OPENAI_API_KEY is set', () => {
      expect(service.hasProvider()).toBe(false);
    });

    it('returns true when OLLAMA_URL is set', () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      expect(service.hasProvider()).toBe(true);
    });

    it('returns true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(service.hasProvider()).toBe(true);
    });

    it('returns true when both providers are set', () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(service.hasProvider()).toBe(true);
    });
  });

  describe('generateEmbedding()', () => {
    it('throws when no provider is configured', async () => {
      await expect(service.generateEmbedding('hello')).rejects.toThrow(
        'No embedding provider'
      );
    });

    it('calls Ollama API and returns embedding when OLLAMA_URL is set', async () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [0.1, 0.2, 0.3] }),
      } as Response);

      const result = await service.generateEmbedding('hello world');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embeddings',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it('throws when Ollama returns a non-ok status', async () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(service.generateEmbedding('text')).rejects.toThrow(
        'Ollama error 500'
      );
    });

    it('calls OpenAI API and returns embedding when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.5, 0.6, 0.7] }] }),
      } as Response);

      const result = await service.generateEmbedding('hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual([0.5, 0.6, 0.7]);
    });

    it('throws when OpenAI returns a non-ok status', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      await expect(service.generateEmbedding('text')).rejects.toThrow(
        'OpenAI error 401'
      );
    });

    it('prefers Ollama over OpenAI when both are configured', async () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      process.env.OPENAI_API_KEY = 'sk-test';
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [1, 2, 3] }),
      } as Response);

      await service.generateEmbedding('text');

      // When OLLAMA_URL is set, the Ollama endpoint is used (not OpenAI)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/embeddings'),
        expect.anything()
      );
    });

    it('uses EMBEDDING_MODEL env var for Ollama model name', async () => {
      process.env.OLLAMA_URL = 'http://localhost:11434';
      process.env.EMBEDDING_MODEL = 'custom-model';
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [0.1] }),
      } as Response);

      await service.generateEmbedding('text');

      const callBody = JSON.parse(
        (mockFetch.mock.calls[0]![1] as RequestInit).body as string
      );
      expect(callBody.model).toBe('custom-model');
    });
  });
});
