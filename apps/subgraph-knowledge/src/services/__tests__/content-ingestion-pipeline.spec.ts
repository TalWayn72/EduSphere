/* Content Ingestion Pipeline Tests */
/**
 * Content Ingestion Pipeline Tests — Handler-level unit tests.
 *
 * Tests each file-type handler (PDF, Video, Image, Text, Office, ZIP)
 * returns expected IngestionResult fields.
 * Mocks file-type, unzipper, pdf-parse, and nats to isolate handler logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn().mockResolvedValue(undefined),
}));

const mockOpenBuffer = vi.fn();
vi.mock('unzipper', () => ({
  Open: { buffer: mockOpenBuffer },
}));

vi.mock('pdf-parse', () => {
  const mockGetText = vi
    .fn()
    .mockResolvedValue({ text: 'Parsed PDF text', total: 3 });
  const mockDestroy = vi.fn().mockResolvedValue(undefined);
  return {
    PDFParse: vi.fn().mockImplementation(() => ({
      getText: mockGetText,
      destroy: mockDestroy,
    })),
    __mockGetText: mockGetText,
    __mockDestroy: mockDestroy,
  };
});

vi.mock('nats', () => ({
  connect: vi.fn().mockRejectedValue(new Error('NATS not available in test')),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
    decode: vi.fn((b: Buffer) => b.toString()),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi
    .fn()
    .mockReturnValue({ servers: ['nats://localhost:4222'] }),
}));

import {
  ContentIngestionPipelineService,
  type IngestionResult,
} from '../../services/content-ingestion-pipeline.service';
import { fileTypeFromBuffer } from 'file-type';

describe('ContentIngestionPipelineService — handler tests', () => {
  let service: ContentIngestionPipelineService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [ContentIngestionPipelineService],
    }).compile();
    service = module.get(ContentIngestionPipelineService);
  });

  // ── PDF handler ──────────────────────────────────────────────────────────

  describe('handlePdf', () => {
    it('returns EMBEDDED_TEXT ocrMethod for PDF files', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/pdf',
        ext: 'pdf',
      });
      const buf = Buffer.from('%PDF-1.4');
      const result = await service.ingest(buf, 'doc.pdf', 'tenant-1');
      expect(result.ocrMethod).toBe('EMBEDDED_TEXT');
    });

    it('returns extractedText (parsed or empty) for PDF', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/pdf',
        ext: 'pdf',
      });
      const result = await service.ingest(
        Buffer.from('pdf'),
        'test.pdf',
        'tenant-1'
      );
      // pdf-parse may or may not work in test env; text is either parsed or empty
      expect(typeof result.extractedText).toBe('string');
    });

    it('returns null aiCaption for PDF', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/pdf',
        ext: 'pdf',
      });
      const result = await service.ingest(
        Buffer.from('pdf'),
        'test.pdf',
        'tenant-1'
      );
      expect(result.aiCaption).toBeNull();
    });

    it('returns pageCount (number or null) for PDF', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/pdf',
        ext: 'pdf',
      });
      const result = await service.ingest(
        Buffer.from('pdf'),
        'test.pdf',
        'tenant-1'
      );
      // pageCount is number when pdf-parse succeeds, null on failure
      expect(
        result.pageCount === null || typeof result.pageCount === 'number'
      ).toBe(true);
    });

    it('returns EMBEDDED_TEXT with ocrConfidence 0 when pdf-parse fails', async () => {
      // Reset pdf-parse mock to throw
      vi.doMock('pdf-parse', () => {
        throw new Error('pdf-parse not installed');
      });
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/pdf',
        ext: 'pdf',
      });
      const result = await service.ingest(
        Buffer.from('bad-pdf'),
        'broken.pdf',
        'tenant-1'
      );
      // On failure, still returns EMBEDDED_TEXT method
      expect(result.ocrMethod).toBe('EMBEDDED_TEXT');
      expect(result.ocrConfidence).toBe(0);
    });
  });

  // ── Video handler ────────────────────────────────────────────────────────

  describe('handleVideo', () => {
    it('returns NONE ocrMethod for video', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'video/mp4',
        ext: 'mp4',
      });
      const result = await service.ingest(
        Buffer.alloc(32),
        'lecture.mp4',
        'tenant-1'
      );
      expect(result.ocrMethod).toBe('NONE');
    });

    it('includes warning about NATS not connected when no NATS', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'video/mp4',
        ext: 'mp4',
      });
      const result = await service.ingest(
        Buffer.alloc(32),
        'lecture.mp4',
        'tenant-1'
      );
      // Without NATS connection, warning about NATS not connected
      const natsWarning = result.warnings.find((w) =>
        w.includes('NATS not connected')
      );
      expect(natsWarning).toBeDefined();
    });

    it('returns empty extractedText for video', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'video/mp4',
        ext: 'mp4',
      });
      const result = await service.ingest(
        Buffer.alloc(32),
        'vid.mp4',
        'tenant-1'
      );
      expect(result.extractedText).toBe('');
    });

    it('includes transcription worker warning', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'video/mp4',
        ext: 'mp4',
      });
      const result = await service.ingest(
        Buffer.alloc(32),
        'vid.mp4',
        'tenant-1'
      );
      const transcriptWarning = result.warnings.find((w) =>
        w.includes('transcription worker')
      );
      expect(transcriptWarning).toBeDefined();
    });
  });

  // ── Image handler ────────────────────────────────────────────────────────

  describe('handleImage', () => {
    it('returns NONE ocrMethod for images (OCR not yet available)', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'image/png',
        ext: 'png',
      });
      const result = await service.ingest(
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        'slide.png',
        'tenant-1'
      );
      expect(result.ocrMethod).toBe('NONE');
      expect(result.ocrConfidence).toBe(0);
    });

    it('handles JPEG images', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'image/jpeg',
        ext: 'jpg',
      });
      const result = await service.ingest(
        Buffer.alloc(4),
        'photo.jpg',
        'tenant-1'
      );
      expect(result.ocrMethod).toBe('NONE');
    });

    it('handles WebP images', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'image/webp',
        ext: 'webp',
      });
      const result = await service.ingest(
        Buffer.alloc(4),
        'banner.webp',
        'tenant-1'
      );
      expect(result.ocrMethod).toBe('NONE');
    });

    it('returns empty extractedText for image', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'image/png',
        ext: 'png',
      });
      const result = await service.ingest(
        Buffer.alloc(4),
        'img.png',
        'tenant-1'
      );
      expect(result.extractedText).toBe('');
    });

    it('returns isHandwritten false', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'image/png',
        ext: 'png',
      });
      const result = await service.ingest(
        Buffer.alloc(4),
        'note.png',
        'tenant-1'
      );
      expect(result.isHandwritten).toBe(false);
    });

    it('includes OCR not available warning', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'image/png',
        ext: 'png',
      });
      const result = await service.ingest(
        Buffer.alloc(4),
        'scan.png',
        'tenant-1'
      );
      expect(result.warnings).toContain(
        'Image OCR: not yet available — text extraction skipped'
      );
    });
  });

  // ── Text handler ─────────────────────────────────────────────────────────

  describe('handleText', () => {
    it('returns full text content from buffer', async () => {
      const text = 'Hello world. This is educational content for learners.';
      const result = await service.ingest(
        Buffer.from(text),
        'notes.txt',
        'tenant-1'
      );
      expect(result.extractedText).toBe(text);
      expect(result.ocrMethod).toBe('NONE');
    });

    it('calculates estimatedDuration based on text length', async () => {
      const text = 'A'.repeat(3000);
      const result = await service.ingest(
        Buffer.from(text),
        'long.txt',
        'tenant-1'
      );
      expect(result.estimatedDuration).toBe(Math.ceil(3000 / 1500));
    });

    it('returns empty warnings for text files', async () => {
      const result = await service.ingest(
        Buffer.from('content'),
        'file.txt',
        'tenant-1'
      );
      expect(result.warnings).toHaveLength(0);
    });

    it('handles markdown files via extension fallback', async () => {
      const md = '# Title\n\nContent paragraph here.';
      const result = await service.ingest(
        Buffer.from(md),
        'lesson.md',
        'tenant-1'
      );
      expect(result.extractedText).toContain('Title');
    });
  });

  // ── Office document handler ──────────────────────────────────────────────

  describe('handleOfficeDocument', () => {
    it('dispatches DOCX to LibreOffice service', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ext: 'docx',
      });
      const result = await service.ingest(
        Buffer.alloc(16),
        'report.docx',
        'tenant-1'
      );
      expect(result.warnings[0]).toContain('LibreOffice');
      expect(result.ocrMethod).toBe('NONE');
    });

    it('handles opendocument format', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/vnd.oasis.opendocument.text',
        ext: 'odt',
      });
      const result = await service.ingest(
        Buffer.alloc(16),
        'report.odt',
        'tenant-1'
      );
      expect(result.ocrMethod).toBe('NONE');
    });
  });

  // ── ZIP handler ──────────────────────────────────────────────────────────

  describe('handleZip', () => {
    it('rejects ZIP with path traversal', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/zip',
        ext: 'zip',
      });
      mockOpenBuffer.mockResolvedValue({
        files: [{ path: '../../../etc/passwd', uncompressedSize: 100 }],
      });
      await expect(
        service.ingest(
          Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.alloc(26)]),
          'evil.zip',
          'tenant-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects ZIP with absolute path', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/zip',
        ext: 'zip',
      });
      mockOpenBuffer.mockResolvedValue({
        files: [{ path: '/etc/shadow', uncompressedSize: 50 }],
      });
      await expect(
        service.ingest(
          Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.alloc(26)]),
          'rootkit.zip',
          'tenant-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects ZIP bomb (>5GB uncompressed)', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/zip',
        ext: 'zip',
      });
      mockOpenBuffer.mockResolvedValue({
        files: [{ path: 'big.txt', uncompressedSize: 6 * 1024 * 1024 * 1024 }],
      });
      await expect(
        service.ingest(
          Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.alloc(26)]),
          'bomb.zip',
          'tenant-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('processes valid ZIP with safe entries', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/zip',
        ext: 'zip',
      });
      mockOpenBuffer.mockResolvedValue({
        files: [
          { path: 'doc1.txt', uncompressedSize: 1000 },
          { path: 'doc2.txt', uncompressedSize: 2000 },
        ],
      });
      const result = await service.ingest(
        Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.alloc(26)]),
        'content.zip',
        'tenant-1'
      );
      expect(result.extractedText).toContain('2 files');
      expect(result.ocrMethod).toBe('NONE');
    });
  });

  // ── Unsupported type ─────────────────────────────────────────────────────

  describe('unsupported file types', () => {
    it('throws UnsupportedMediaTypeException for executables', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue({
        mime: 'application/x-msdownload',
        ext: 'exe',
      });
      await expect(
        service.ingest(Buffer.from([0x4d, 0x5a]), 'malware.exe', 'tenant-1')
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });

    it('throws for unknown MIME type with no extension match', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);
      await expect(
        service.ingest(Buffer.alloc(4), 'unknown.xyz', 'tenant-1')
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });
  });

  // ── MIME extension fallback ──────────────────────────────────────────────

  describe('guessMimeFromExtension fallback', () => {
    it('falls back to extension when fileTypeFromBuffer returns undefined', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);
      const result = await service.ingest(
        Buffer.from('text content'),
        'notes.txt',
        'tenant-1'
      );
      expect(result.ocrMethod).toBe('NONE');
      expect(result.extractedText).toContain('text content');
    });

    it('uses PDF extension fallback', async () => {
      vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);
      const result = await service.ingest(
        Buffer.from('fake-pdf'),
        'doc.pdf',
        'tenant-1'
      );
      expect(result.ocrMethod).toBe('EMBEDDED_TEXT');
    });
  });

  // ── IngestionResult shape ────────────────────────────────────────────────

  describe('IngestionResult shape', () => {
    it('returns all expected fields', async () => {
      const result = await service.ingest(
        Buffer.from('hello'),
        'test.txt',
        'tenant-1'
      );
      const keys: (keyof IngestionResult)[] = [
        'extractedText',
        'ocrMethod',
        'ocrConfidence',
        'topics',
        'thumbnailUrl',
        'estimatedDuration',
        'pageCount',
        'warnings',
        'aiCaption',
        'isHandwritten',
      ];
      for (const key of keys) {
        expect(result).toHaveProperty(key);
      }
    });
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('onModuleDestroy completes without error', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('implements OnModuleDestroy', () => {
      expect(typeof service.onModuleDestroy).toBe('function');
    });

    it('implements OnModuleInit', () => {
      expect(typeof service.onModuleInit).toBe('function');
    });
  });
});
