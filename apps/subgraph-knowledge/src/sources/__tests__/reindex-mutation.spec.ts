/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reindex Mutation Tests
 *
 * Tests the ContentIngestionResolver:
 * - Returns correct ingestion result structure
 * - Requires authentication (tenantId in context)
 * - Handles missing file URL gracefully
 * - Handles download failure gracefully
 * - Handles OCR failure gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ContentIngestionResolver } from '../content-ingestion.resolver';
import type { TesseractOcrService } from '../../services/tesseract-ocr.service';

const mockOcrService: Partial<TesseractOcrService> = {
  extractText: vi.fn().mockResolvedValue({
    text: 'Extracted text from OCR',
    confidence: 0.95,
  }),
};

describe('ContentIngestionResolver — reindex mutation', () => {
  let resolver: ContentIngestionResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new ContentIngestionResolver(
      mockOcrService as TesseractOcrService
    );
  });

  describe('authentication', () => {
    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = { authContext: { tenantId: null, userId: 'u-1' } } as any;
      await expect(
        resolver.ingestContent('http://example.com/file.pdf', 'course-1', ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when authContext is missing', async () => {
      const ctx = {} as any;
      await expect(
        resolver.ingestContent('http://example.com/file.pdf', 'course-1', ctx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('succeeds with valid tenant context', async () => {
      // Mock fetch to return a valid response
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as any);

      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(
        'http://example.com/file.png',
        'course-1',
        ctx
      );
      expect(result.contentItemId).toBeDefined();
      expect(typeof result.contentItemId).toBe('string');
      mockFetch.mockRestore();
    });
  });

  describe('result structure', () => {
    it('returns all required fields in ContentIngestionResultDto', async () => {
      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      // No file URL → returns empty result
      const result = await resolver.ingestContent(null as any, 'course-1', ctx);

      expect(result).toHaveProperty('contentItemId');
      expect(result).toHaveProperty('extractedText');
      expect(result).toHaveProperty('aiCaption');
      expect(result).toHaveProperty('isHandwritten');
      expect(result).toHaveProperty('ocrMethod');
      expect(result).toHaveProperty('ocrConfidence');
      expect(result).toHaveProperty('topics');
      expect(result).toHaveProperty('thumbnailUrl');
      expect(result).toHaveProperty('estimatedDuration');
      expect(result).toHaveProperty('pageCount');
      expect(result).toHaveProperty('warnings');
    });

    it('contentItemId is a valid UUID', async () => {
      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(null as any, 'course-1', ctx);
      expect(result.contentItemId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe('missing file URL', () => {
    it('returns empty result when file URL is null', async () => {
      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(null as any, 'course-1', ctx);
      expect(result.extractedText).toBe('');
      expect(result.ocrMethod).toBe('NONE');
      expect(result.ocrConfidence).toBe(1);
    });

    it('includes warning about missing file URL', async () => {
      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(null as any, 'course-1', ctx);
      expect(result.warnings).toContain(
        'No file URL provided for OCR extraction'
      );
    });

    it('handles file as object without url property', async () => {
      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent({} as any, 'course-1', ctx);
      expect(result.extractedText).toBe('');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('download failure', () => {
    it('returns empty result when download fails', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(
        'http://example.com/missing.pdf',
        'course-1',
        ctx
      );
      expect(result.extractedText).toBe('');
      expect(result.ocrConfidence).toBe(0);
      expect(result.warnings[0]).toContain('File download failed');
      mockFetch.mockRestore();
    });

    it('handles network error during download', async () => {
      const mockFetch = vi
        .spyOn(global, 'fetch')
        .mockRejectedValue(new Error('Network timeout'));

      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(
        'http://example.com/slow.pdf',
        'course-1',
        ctx
      );
      expect(result.extractedText).toBe('');
      expect(result.warnings[0]).toContain('File download failed');
      mockFetch.mockRestore();
    });
  });

  describe('OCR failure', () => {
    it('returns partial result when OCR extraction fails', async () => {
      vi.mocked(mockOcrService.extractText!).mockRejectedValue(
        new Error('Tesseract binary not found')
      );

      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as any);

      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(
        'http://example.com/scan.png',
        'course-1',
        ctx
      );
      expect(result.extractedText).toBe('');
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('OCR extraction failed'),
        ])
      );
      mockFetch.mockRestore();
    });
  });

  describe('successful OCR', () => {
    it('returns extracted text and TESSERACT method on success', async () => {
      vi.mocked(mockOcrService.extractText!).mockResolvedValue({
        text: 'Hello from OCR',
        confidence: 0.92,
      });

      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as any);

      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(
        'http://example.com/doc.png',
        'course-1',
        ctx
      );
      expect(result.extractedText).toBe('Hello from OCR');
      expect(result.ocrMethod).toBe('TESSERACT');
      expect(result.ocrConfidence).toBe(0.92);
      mockFetch.mockRestore();
    });

    it('handles file URL passed as string directly', async () => {
      vi.mocked(mockOcrService.extractText!).mockResolvedValue({
        text: 'Direct URL text',
        confidence: 0.88,
      });

      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      } as any);

      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(
        'http://minio:9000/bucket/file.jpg',
        'course-1',
        ctx
      );
      expect(result.extractedText).toBe('Direct URL text');
      mockFetch.mockRestore();
    });

    it('handles file URL from object with url property', async () => {
      vi.mocked(mockOcrService.extractText!).mockResolvedValue({
        text: 'Object URL text',
        confidence: 0.91,
      });

      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      } as any);

      const ctx = {
        authContext: { tenantId: 'tenant-1', userId: 'user-1' },
      } as any;
      const result = await resolver.ingestContent(
        { url: 'http://minio:9000/bucket/file.jpg' } as any,
        'course-1',
        ctx
      );
      expect(result.extractedText).toBe('Object URL text');
      mockFetch.mockRestore();
    });
  });
});
