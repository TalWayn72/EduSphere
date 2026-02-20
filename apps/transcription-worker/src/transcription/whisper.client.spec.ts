import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('WhisperClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('throws when neither WHISPER_URL nor OPENAI_API_KEY is set', async () => {
      delete process.env.WHISPER_URL;
      delete process.env.OPENAI_API_KEY;
      const { WhisperClient } = await import('./whisper.client');
      expect(() => new WhisperClient()).toThrow(
        'Neither WHISPER_URL nor OPENAI_API_KEY is set'
      );
    });

    it('initialises in local mode when WHISPER_URL is set', async () => {
      process.env.WHISPER_URL = 'http://localhost:9000';
      delete process.env.OPENAI_API_KEY;
      const { WhisperClient } = await import('./whisper.client');
      expect(() => new WhisperClient()).not.toThrow();
    });

    it('initialises in OpenAI mode when OPENAI_API_KEY is set', async () => {
      delete process.env.WHISPER_URL;
      process.env.OPENAI_API_KEY = 'sk-test-key';
      const { WhisperClient } = await import('./whisper.client');
      expect(() => new WhisperClient()).not.toThrow();
    });
  });

  describe('transcribeLocal', () => {
    beforeEach(() => {
      process.env.WHISPER_URL = 'http://localhost:9000';
      delete process.env.OPENAI_API_KEY;
    });

    it('calls local Whisper endpoint and returns parsed response', async () => {
      const mockResponse = {
        text: 'Hello world',
        language: 'en',
        segments: [{ start: 0.0, end: 1.5, text: 'Hello world' }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      // Mock createReadStream so file access is not required
      vi.mock('fs', async () => ({
        createReadStream: vi.fn().mockReturnValue(Buffer.from('audio')),
      }));

      const { WhisperClient } = await import('./whisper.client');
      const client = new WhisperClient();
      const result = await client.transcribe('/tmp/test.mp3');

      expect(result.text).toBe('Hello world');
      expect(result.language).toBe('en');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].start).toBe(0.0);
    });

    it('throws InternalServerErrorException when local endpoint fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      vi.mock('fs', async () => ({
        createReadStream: vi.fn().mockReturnValue(Buffer.from('audio')),
      }));

      const { WhisperClient } = await import('./whisper.client');
      const client = new WhisperClient();
      await expect(client.transcribe('/tmp/test.mp3')).rejects.toThrow(
        'Local Whisper transcription failed'
      );
    });
  });

  describe('segment mapping', () => {
    it('trims whitespace from segment text', async () => {
      process.env.WHISPER_URL = 'http://localhost:9000';

      const mockResponse = {
        text: '  trimmed  ',
        language: 'en',
        segments: [{ start: 0, end: 1, text: '  trimmed  ' }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      vi.mock('fs', async () => ({
        createReadStream: vi.fn().mockReturnValue(Buffer.from('')),
      }));

      const { WhisperClient } = await import('./whisper.client');
      const client = new WhisperClient();
      const result = await client.transcribe('/tmp/test.mp3');
      expect(result.segments[0].text).toBe('trimmed');
    });
  });
});
