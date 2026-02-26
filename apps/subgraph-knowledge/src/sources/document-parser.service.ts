/**
 * DocumentParserService — converts local files and URLs into plaintext.
 *
 * Supported sources:
 *  • DOCX  — uses mammoth (Word → HTML → strip tags)
 *  • PDF   — page-by-page text extraction (placeholder; add pdf-parse if needed)
 *  • URL   — fetch HTML + strip tags
 *  • TEXT  — passthrough
 */

import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export type ParseResult = {
  text: string;
  wordCount: number;
  metadata: Record<string, unknown>;
};

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  /** Parse a local DOCX file path → plaintext */
  async parseDocx(filePath: string): Promise<ParseResult> {
    const { default: mammoth } = await import('mammoth');
    const absPath = resolve(filePath);
    const buffer = readFileSync(absPath);
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      this.logger.warn(`mammoth warnings for ${filePath}`, result.messages);
    }

    const text = result.value.trim();
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      metadata: { source_type: 'FILE_DOCX', original_path: filePath },
    };
  }

  /** Fetch a URL and extract readable text (strips HTML tags) */
  async parseUrl(url: string): Promise<ParseResult> {
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
      // Strip HTML tags and collapse whitespace
      text = raw
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
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
