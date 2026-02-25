/**
 * document-parser.service.pdf-youtube.spec.ts
 *
 * Unit tests for parsePdf(), parseYoutube(), and the parseDocx(Buffer) overload.
 * All dynamic imports (pdf-parse, youtube-transcript, mammoth) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    text: 'Extracted PDF content\nPage two text',
    numpages: 2,
  }),
}));

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn().mockResolvedValue([
      { text: 'Hello from the video' },
      { text: 'This is a test transcript' },
    ]),
  },
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn().mockResolvedValue({
      value: 'Mammoth extracted text from buffer',
      messages: [],
    }),
  },
}));

// Mock fs so parseDocx(string) does not hit the real filesystem
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, readFileSync: vi.fn().mockReturnValue(Buffer.from('fake docx bytes')) };
});

import { DocumentParserService } from './document-parser.service.js';

describe('DocumentParserService — PDF + YouTube + DOCX buffer', () => {
  let service: DocumentParserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentParserService();
  });

  // ── parsePdf ──────────────────────────────────────────────────────────────

  describe('parsePdf()', () => {
    it('returns extracted text from pdf-parse', async () => {
      const result = await service.parsePdf(Buffer.from('%PDF mock'));
      expect(result.text).toContain('Extracted PDF content');
      expect(result.metadata).toMatchObject({ source_type: 'FILE_PDF', pages: 2 });
    });

    it('returns wordCount > 0 for non-empty PDF', async () => {
      const result = await service.parsePdf(Buffer.from('%PDF'));
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  // ── parseYoutube ──────────────────────────────────────────────────────────

  describe('parseYoutube()', () => {
    it('joins transcript segments into single text', async () => {
      const result = await service.parseYoutube('https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.text).toBe('Hello from the video This is a test transcript');
      expect(result.metadata).toMatchObject({ source_type: 'YOUTUBE', video_id: 'dQw4w9WgXcQ' });
    });

    it('handles youtu.be short URLs', async () => {
      const result = await service.parseYoutube('https://youtu.be/dQw4w9WgXcQ');
      expect(result.metadata).toMatchObject({ video_id: 'dQw4w9WgXcQ' });
    });

    it('handles /shorts/ URLs', async () => {
      const result = await service.parseYoutube('https://youtube.com/shorts/dQw4w9WgXcQ');
      expect(result.metadata).toMatchObject({ video_id: 'dQw4w9WgXcQ' });
    });

    it('throws for an invalid YouTube URL', async () => {
      await expect(service.parseYoutube('https://vimeo.com/123456')).rejects.toThrow(/Cannot extract video ID/);
    });

    it('returns wordCount matching transcript words', async () => {
      const result = await service.parseYoutube('https://youtu.be/dQw4w9WgXcQ');
      expect(result.wordCount).toBe(9); // "Hello from the video This is a test transcript"
    });
  });

  // ── parseDocx(Buffer) overload ─────────────────────────────────────────────

  describe('parseDocx(Buffer)', () => {
    it('accepts a Buffer and returns extracted text', async () => {
      const result = await service.parseDocx(Buffer.from('PK fake docx'));
      expect(result.text).toBe('Mammoth extracted text from buffer');
      expect(result.metadata).toMatchObject({ source_type: 'FILE_DOCX' });
    });

    it('accepts a string path (backward compat — readFileSync mocked)', async () => {
      const result = await service.parseDocx('/some/path/doc.docx');
      expect(result.text).toBe('Mammoth extracted text from buffer');
    });
  });
});
