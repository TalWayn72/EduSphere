import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';

// Mock modules at module level (hoisted by vitest)
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn().mockResolvedValue(undefined),
}));

const mockOpenBuffer = vi.fn();
vi.mock('unzipper', () => ({
  Open: { buffer: mockOpenBuffer },
}));

import { ContentIngestionPipelineService } from '../services/content-ingestion-pipeline.service';
import { fileTypeFromBuffer } from 'file-type';

describe('ContentIngestionPipelineService', () => {
  let service: ContentIngestionPipelineService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [ContentIngestionPipelineService],
    }).compile();
    service = module.get(ContentIngestionPipelineService);
  });

  it('plain text file returns extractedText', async () => {
    const buf = Buffer.from('Hello world. This is test content.', 'utf8');
    const result = await service.ingest(buf, 'lesson.txt', 'tenant-1');
    expect(result.extractedText).toContain('Hello world');
    expect(result.ocrMethod).toBe('NONE');
  });

  it('markdown file returns text content', async () => {
    const md = '# Lesson Title\n\nThis is lesson content with more than fifty characters total.';
    const buf = Buffer.from(md, 'utf8');
    const result = await service.ingest(buf, 'lesson.md', 'tenant-1');
    expect(result.extractedText).toContain('Lesson Title');
    expect(result.ocrMethod).toBe('NONE');
  });

  it('unsupported file type throws UnsupportedMediaTypeException', async () => {
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({ mime: 'application/x-msdownload', ext: 'exe' });
    const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    await expect(service.ingest(buf, 'malware.exe', 'tenant-1'))
      .rejects.toThrow(UnsupportedMediaTypeException);
  });

  it('ZIP with path traversal throws BadRequestException', async () => {
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({ mime: 'application/zip', ext: 'zip' });
    mockOpenBuffer.mockResolvedValue({
      files: [{ path: '../../../etc/passwd', uncompressedSize: 100 }],
    });
    const zipBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.alloc(26)]);
    await expect(service.ingest(zipBuf, 'evil.zip', 'tenant-1'))
      .rejects.toThrow(BadRequestException);
  });

  it('ZIP bomb throws BadRequestException when uncompressed > 5GB', async () => {
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({ mime: 'application/zip', ext: 'zip' });
    mockOpenBuffer.mockResolvedValue({
      files: [{ path: 'file.txt', uncompressedSize: 6 * 1024 * 1024 * 1024 }],
    });
    const zipBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.alloc(26)]);
    await expect(service.ingest(zipBuf, 'bomb.zip', 'tenant-1'))
      .rejects.toThrow(BadRequestException);
  });

  it('PDF file returns EMBEDDED_TEXT ocrMethod', async () => {
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
    const buf = Buffer.from('%PDF-1.4 test content');
    const result = await service.ingest(buf, 'lesson.pdf', 'tenant-1');
    expect(result.ocrMethod).toBe('EMBEDDED_TEXT');
  });

  it('image file returns TESSERACT ocrMethod', async () => {
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({ mime: 'image/png', ext: 'png' });
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const result = await service.ingest(buf, 'slide.png', 'tenant-1');
    expect(result.ocrMethod).toBe('TESSERACT');
  });

  it('video file dispatches to transcription worker', async () => {
    vi.mocked(fileTypeFromBuffer).mockResolvedValue({ mime: 'video/mp4', ext: 'mp4' });
    const buf = Buffer.alloc(32);
    const result = await service.ingest(buf, 'lecture.mp4', 'tenant-1');
    expect(result.ocrMethod).toBe('NONE');
    expect(result.warnings[0]).toContain('transcription worker');
  });

  it('onModuleDestroy completes without error', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });
});
