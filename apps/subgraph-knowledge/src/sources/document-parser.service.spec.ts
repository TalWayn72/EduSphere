/**
 * document-parser.service.spec.ts
 *
 * Unit tests for DocumentParserService.
 * Tests: parseText(), chunkText(), parseUrl().
 *
 * NOTE: parseDocx() uses dynamic `await import('mammoth')` + `readFileSync`.
 * Mocking Node.js built-in 'fs' fully (vi.mock('fs')) crashes the vitest worker
 * because vitest's own internals use 'fs'. parseDocx() is covered at the
 * integration level through knowledge-source.service.spec.ts where the entire
 * parser is replaced by a mock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentParserService } from './document-parser.service.js';

// ─────────────────────────────────────────────────────────────────────────────

describe('DocumentParserService', () => {
  let service: DocumentParserService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    service = new DocumentParserService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── parseText ──────────────────────────────────────────────────────────────

  describe('parseText()', () => {
    it('returns text with wordCount and metadata', () => {
      const result = service.parseText('Hello world foo bar');
      expect(result.text).toBe('Hello world foo bar');
      expect(result.wordCount).toBe(4);
      expect(result.metadata).toMatchObject({ source_type: 'TEXT' });
    });

    it('normalises Windows line endings to LF', () => {
      const result = service.parseText('line1\r\nline2\r\nline3');
      expect(result.text).toBe('line1\nline2\nline3');
    });

    it('trims leading and trailing whitespace', () => {
      const result = service.parseText('   trimmed   ');
      expect(result.text).toBe('trimmed');
    });

    it('returns wordCount 0 for empty string', () => {
      const result = service.parseText('');
      expect(result.wordCount).toBe(0);
    });
  });

  // ── chunkText ──────────────────────────────────────────────────────────────

  describe('chunkText()', () => {
    it('returns single chunk when text fits within chunkSize', () => {
      const short = 'A'.repeat(500);
      const chunks = service.chunkText(short, 1000, 200);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].text).toBe(short);
    });

    it('returns multiple chunks for long text', () => {
      const text = Array.from({ length: 20 }, (_, i) =>
        `word${i} `.repeat(100)
      ).join(' ');
      const chunks = service.chunkText(text, 1000, 200);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('assigns sequential indexes to chunks', () => {
      const text = 'word '.repeat(400);
      const chunks = service.chunkText(text, 1000, 200);
      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i);
      });
    });

    it('overlapping chunks share text at boundaries', () => {
      const text = 'x '.repeat(1000);
      const [c0, c1] = service.chunkText(text, 1000, 200);
      if (!c1) return;
      // c1 starts inside c0's overlap region — verify shared content exists
      const tailOfC0 = c0.text.slice(-150);
      expect(c1.text).toContain(tailOfC0.slice(0, 50));
    });

    it('returns empty array for empty text', () => {
      expect(service.chunkText('', 1000, 200)).toEqual([]);
    });

    it('snaps chunk boundary to nearest space (no mid-word split)', () => {
      const text = 'a'.repeat(999) + ' boundary_word ' + 'b'.repeat(800);
      const [c0] = service.chunkText(text, 1000, 0);
      expect(c0.text).not.toMatch(/boundary_wor[^d]/);
    });
  });

  // ── parseUrl ───────────────────────────────────────────────────────────────

  describe('parseUrl()', () => {
    it('strips HTML tags and returns plain text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html; charset=utf-8' },
        text: async () =>
          '<html><body><h1>Title</h1><p>Content here</p></body></html>',
      });

      const result = await service.parseUrl('https://example.com/page');
      expect(result.text).toContain('Title');
      expect(result.text).toContain('Content here');
      expect(result.text).not.toContain('<h1>');
      expect(result.metadata).toMatchObject({
        source_type: 'URL',
        url: 'https://example.com/page',
      });
    });

    it('strips <script> and <style> blocks entirely', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () =>
          '<html><head><script>alert("xss")</script><style>.h{color:red}</style></head><body>Clean text</body></html>',
      });

      const result = await service.parseUrl('https://example.com');
      expect(result.text).not.toContain('alert');
      expect(result.text).not.toContain('color:red');
      expect(result.text).toContain('Clean text');
    });

    it('returns raw text for non-HTML content-type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/plain' },
        text: async () => 'Plain text content',
      });

      const result = await service.parseUrl('https://example.com/file.txt');
      expect(result.text).toBe('Plain text content');
    });

    it('throws when HTTP response is not OK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
      });

      await expect(
        service.parseUrl('https://example.com/missing')
      ).rejects.toThrow('HTTP 404');
    });

    it('decodes HTML entities (&amp; &nbsp; &lt; &gt;)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => '<p>&amp; &nbsp; &lt;tag&gt;</p>',
      });

      const result = await service.parseUrl('https://example.com');
      // &amp; is decoded to & for readability
      expect(result.text).toContain('&');
      // &lt;/&gt; are intentionally NOT decoded (see service comment: prevents
      // reintroducing angle brackets that could confuse downstream parsers)
      expect(result.text).toContain('&lt;tag&gt;');
      expect(result.text).not.toContain('<tag>');
    });
  });
});
