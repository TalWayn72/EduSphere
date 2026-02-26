import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the embed function directly; fetch is mocked globally
const originalFetch = global.fetch;

function mockFetchOk(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

function mockFetchError(status: number) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: async () => 'server error',
  } as unknown as Response);
}

// Reset env between tests
const savedEnv: Record<string, string | undefined> = {};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    savedEnv[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

function restoreEnv() {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

describe('ollama.client — embed()', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    restoreEnv();
  });

  describe('Ollama path (OLLAMA_URL set)', () => {
    it('calls Ollama /api/embeddings and returns the vector', async () => {
      setEnv({ OLLAMA_URL: 'http://ollama:11434', OPENAI_API_KEY: undefined });
      mockFetchOk({ embedding: [0.1, 0.2, 0.3] });

      const { embed } = await import('./ollama.client');
      const result = await embed('hello world');

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://ollama:11434/api/embeddings',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uses EMBEDDING_MODEL env for the model field', async () => {
      setEnv({
        OLLAMA_URL: 'http://ollama:11434',
        EMBEDDING_MODEL: 'all-minilm',
        OPENAI_API_KEY: undefined,
      });
      mockFetchOk({ embedding: [0.5] });

      const { embed } = await import('./ollama.client');
      await embed('test');

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);
      expect(body.model).toBe('all-minilm');
    });

    it('defaults to nomic-embed-text when EMBEDDING_MODEL not set', async () => {
      setEnv({
        OLLAMA_URL: 'http://ollama:11434',
        EMBEDDING_MODEL: undefined,
        OPENAI_API_KEY: undefined,
      });
      mockFetchOk({ embedding: [0.1] });

      const { embed } = await import('./ollama.client');
      await embed('text');

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);
      expect(body.model).toBe('nomic-embed-text');
    });

    it('throws on Ollama HTTP error', async () => {
      setEnv({ OLLAMA_URL: 'http://ollama:11434', OPENAI_API_KEY: undefined });
      mockFetchError(500);

      const { embed } = await import('./ollama.client');
      await expect(embed('text')).rejects.toThrow(
        'Ollama embeddings error 500'
      );
    });

    it('throws when Ollama returns empty embedding', async () => {
      setEnv({ OLLAMA_URL: 'http://ollama:11434', OPENAI_API_KEY: undefined });
      mockFetchOk({ embedding: [] });

      const { embed } = await import('./ollama.client');
      await expect(embed('text')).rejects.toThrow('empty embedding vector');
    });

    it('strips trailing slash from OLLAMA_URL', async () => {
      setEnv({ OLLAMA_URL: 'http://ollama:11434/', OPENAI_API_KEY: undefined });
      mockFetchOk({ embedding: [0.1] });

      const { embed } = await import('./ollama.client');
      await embed('text');

      const [url] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe('http://ollama:11434/api/embeddings');
    });
  });

  describe('OpenAI path (OPENAI_API_KEY set, no OLLAMA_URL)', () => {
    it('calls OpenAI /v1/embeddings and returns the vector', async () => {
      setEnv({ OLLAMA_URL: undefined, OPENAI_API_KEY: 'sk-test-key' });
      mockFetchOk({ data: [{ embedding: [0.7, 0.8] }] });

      const { embed } = await import('./ollama.client');
      const result = await embed('hello');

      expect(result).toEqual([0.7, 0.8]);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key',
          }),
        })
      );
    });

    it('requests dimensions: 768', async () => {
      setEnv({ OLLAMA_URL: undefined, OPENAI_API_KEY: 'sk-test' });
      mockFetchOk({ data: [{ embedding: [0.1] }] });

      const { embed } = await import('./ollama.client');
      await embed('test');

      const call = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);
      expect(body.dimensions).toBe(768);
    });

    it('throws on OpenAI HTTP error', async () => {
      setEnv({ OLLAMA_URL: undefined, OPENAI_API_KEY: 'sk-test' });
      mockFetchError(401);

      const { embed } = await import('./ollama.client');
      await expect(embed('text')).rejects.toThrow(
        'OpenAI embeddings error 401'
      );
    });

    it('throws when OpenAI returns empty data', async () => {
      setEnv({ OLLAMA_URL: undefined, OPENAI_API_KEY: 'sk-test' });
      mockFetchOk({ data: [] });

      const { embed } = await import('./ollama.client');
      await expect(embed('text')).rejects.toThrow('empty embedding vector');
    });
  });

  describe('No provider configured', () => {
    it('throws a descriptive error', async () => {
      setEnv({ OLLAMA_URL: undefined, OPENAI_API_KEY: undefined });

      const { embed } = await import('./ollama.client');
      await expect(embed('text')).rejects.toThrow(
        'No embedding provider configured'
      );
    });
  });
});
