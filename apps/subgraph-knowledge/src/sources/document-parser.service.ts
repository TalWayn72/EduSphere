/**
 * DocumentParserService — converts local files, buffers and URLs into plaintext.
 *
 * Supported sources:
 *  • DOCX  — uses mammoth (Word → HTML → strip tags); accepts string path or Buffer
 *  • PDF   — uses pdf-parse (Buffer → text)
 *  • URL   — fetch HTML + strip tags
 *  • TEXT  — passthrough
 *  • YOUTUBE — fetches auto-generated transcript via youtube-transcript
 */

import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';

export type ParseResult = {
  text: string;
  wordCount: number;
  metadata: Record<string, unknown>;
};

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  /** Parse a local DOCX file path or an in-memory Buffer → plaintext */
  async parseDocx(source: string | Buffer): Promise<ParseResult> {
    // mammoth is CommonJS; ESM dynamic import wraps it as { default: module, ...named }.
    // Use the same defensive pattern as pdf-parse to handle both import shapes.
    const mammothModule = await import('mammoth');
    const mammoth = (mammothModule.default ?? mammothModule) as typeof mammothModule;
    const buffer =
      typeof source === 'string'
        ? readFileSync(source) // source is always an absolute path when string
        : source;
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      const src = typeof source === 'string' ? source : '<buffer>';
      this.logger.warn(`mammoth warnings for ${src}`, result.messages);
    }

    const text = result.value.trim();
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      metadata: { source_type: 'FILE_DOCX' },
    };
  }

  /** Parse a PDF buffer → plaintext (uses pdf-parse) */
  async parsePdf(buffer: Buffer): Promise<ParseResult> {
    // Dynamic import avoids pdf-parse's test-runner auto-execution at require time.
    // Cast to callable: pdf-parse@2.4.5 changed its CJS export shape and TypeScript
    // infers the module object rather than the callable default export.
    type PdfParseFn = (
      buf: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule.default ??
      pdfParseModule) as unknown as PdfParseFn;
    const data = await pdfParse(buffer);
    const text = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\s{3,}/g, '\n')
      .trim();
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      metadata: { source_type: 'FILE_PDF', pages: data.numpages },
    };
  }

  /** Fetch a URL and extract readable text (strips HTML tags) */
  async parseUrl(url: string): Promise<ParseResult> {
    // SSRF guard: only allow http/https and block private/loopback IPs
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Disallowed URL protocol: ${parsed.protocol}`);
    }
    const privateIpPattern =
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|0\.0\.0\.0)/i;
    if (privateIpPattern.test(parsed.hostname)) {
      throw new Error(`SSRF protection: private/loopback host not allowed`);
    }

    this.logger.log(`Fetching URL: ${url}`);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EduSphere-KnowledgeBot/1.0' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }

    const contentType = res.headers.get('content-type') ?? '';
    const raw = await res.text();

    let text: string;
    if (contentType.includes('text/html')) {
      // Strip HTML tags and collapse whitespace.
      // Entity decoding is intentionally limited to safe characters only
      // (no &lt;/&gt; conversion) to prevent reintroducing angle brackets.
      text = raw
        .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s{2,}/g, ' ')
        .trim();
    } else {
      text = raw.trim();
    }

    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      metadata: { source_type: 'URL', url, content_type: contentType },
    };
  }

  /** Parse raw text (passthrough, just normalise whitespace) */
  parseText(raw: string): ParseResult {
    const text = raw.replace(/\r\n/g, '\n').trim();
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      metadata: { source_type: 'TEXT' },
    };
  }

  /** Fetch a YouTube video transcript via youtube-transcript package */
  async parseYoutube(videoUrl: string): Promise<ParseResult> {
    const videoId = this.extractYoutubeId(videoUrl);
    if (!videoId)
      throw new Error(`Cannot extract video ID from URL: ${videoUrl}`);

    this.logger.log(`Fetching YouTube transcript for video ${videoId}`);

    // Dynamic import — youtube-transcript uses CJS-compatible syntax
    const { YoutubeTranscript } = await import('youtube-transcript');
    const segments = await YoutubeTranscript.fetchTranscript(videoId);

    const text = segments
      .map((s: { text: string }) => s.text)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      metadata: { source_type: 'YOUTUBE', video_id: videoId, url: videoUrl },
    };
  }

  private extractYoutubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1] ?? null;
    }
    return null;
  }

  /**
   * Split text into overlapping chunks suitable for embedding.
   * Default: 1 000-char chunks with 200-char overlap.
   */
  chunkText(
    text: string,
    chunkSize = 1000,
    overlap = 200
  ): Array<{ index: number; text: string }> {
    const chunks: Array<{ index: number; text: string }> = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      // Snap to a word boundary
      let end = Math.min(start + chunkSize, text.length);
      if (end < text.length) {
        const spaceIdx = text.lastIndexOf(' ', end);
        if (spaceIdx > start) end = spaceIdx;
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) chunks.push({ index, text: chunk });

      if (end >= text.length) break;
      start = end - overlap;
      index++;
    }

    return chunks;
  }
}
