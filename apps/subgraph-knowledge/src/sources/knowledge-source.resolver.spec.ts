import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── KnowledgeSourceService mock ──────────────────────────────────────────────
const mockListByCourseSources = vi.fn();
const mockFindById = vi.fn();
const mockCreateAndProcess = vi.fn();
const mockDeleteSource = vi.fn();
const mockUpdateSource = vi.fn();

vi.mock('./knowledge-source.service.js', () => ({
  KnowledgeSourceService: class {
    listByCourseSources = mockListByCourseSources;
    findById = mockFindById;
    createAndProcess = mockCreateAndProcess;
    deleteSource = mockDeleteSource;
    updateSource = mockUpdateSource;
  },
}));

// ─── MinioUrlService mock ─────────────────────────────────────────────────────
const mockGetPresignedUrl = vi
  .fn()
  .mockResolvedValue('https://minio.local/presigned');

vi.mock('./minio-url.service.js', () => ({
  MinioUrlService: class {
    getPresignedUrl = mockGetPresignedUrl;
  },
}));

// ─── DB import mock ───────────────────────────────────────────────────────────
vi.mock('@edusphere/db', () => ({}));

import { KnowledgeSourceResolver } from './knowledge-source.resolver.js';
import { KnowledgeSourceService } from './knowledge-source.service.js';
import { MinioUrlService } from './minio-url.service.js';

type KSRow = {
  id: string;
  course_id: string | null;
  tenant_id: string;
  title: string;
  source_type: string;
  origin: string;
  raw_content: string | null;
  status: string;
  chunk_count: number;
  error_message: string | null;
  metadata: unknown;
  file_key: string | null;
  created_at: Date | string;
};

const sampleRow: KSRow = {
  id: 'ks-1',
  course_id: 'course-1',
  tenant_id: 'tenant-1',
  title: 'Intro to React',
  source_type: 'URL',
  origin: 'https://example.com',
  raw_content: 'A'.repeat(600),
  status: 'READY',
  chunk_count: 10,
  error_message: null,
  metadata: {},
  file_key: null,
  created_at: new Date('2024-01-01'),
};

const makeCtx = (tenantId = 'tenant-1') => ({
  authContext: { tenantId },
});

describe('KnowledgeSourceResolver', () => {
  let resolver: KnowledgeSourceResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new KnowledgeSourceResolver(
      new KnowledgeSourceService({} as never, {} as never, {} as never),
      new MinioUrlService()
    );
  });

  describe('auth check', () => {
    it('throws UnauthorizedException when tenantId missing', async () => {
      const ctx = { authContext: {} } as never;
      await expect(resolver.courseKnowledgeSources('c-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws UnauthorizedException when authContext is completely absent', async () => {
      const ctx = {} as never;
      await expect(resolver.courseKnowledgeSources('c-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws UnauthorizedException for addFileSource when tenantId is missing', async () => {
      const ctx = { authContext: {} } as never;
      await expect(
        resolver.addFileSource(
          {
            courseId: 'c-1',
            title: 'nahar-shalom.docx',
            fileName: 'nahar-shalom.docx',
            contentBase64: 'JVBERi0=',
            mimeType:
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          ctx
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for addUrlSource when authContext is absent', async () => {
      const ctx = {} as never;
      await expect(
        resolver.addUrlSource(
          { courseId: 'c-1', title: 'Test', url: 'https://test.com' },
          ctx
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for deleteKnowledgeSource when tenantId missing', async () => {
      const ctx = { authContext: {} } as never;
      await expect(resolver.deleteKnowledgeSource('ks-1', ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('courseKnowledgeSources()', () => {
    it('returns mapped sources for a course', async () => {
      mockListByCourseSources.mockResolvedValue([sampleRow]);
      const result = await resolver.courseKnowledgeSources(
        'course-1',
        makeCtx()
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.courseId).toBe('course-1');
      expect(result[0]!.sourceType).toBe('URL');
    });

    it('maps raw_content preview to first 500 chars', async () => {
      const longContent = 'X'.repeat(600);
      const row = { ...sampleRow, raw_content: longContent };
      mockListByCourseSources.mockResolvedValue([row]);
      const result = await resolver.courseKnowledgeSources(
        'course-1',
        makeCtx()
      );
      expect(result[0]!.preview).toBe('X'.repeat(500));
    });
  });

  describe('knowledgeSource()', () => {
    it('returns mapped source by id', async () => {
      mockFindById.mockResolvedValue(sampleRow);
      const result = await resolver.knowledgeSource('ks-1', makeCtx());
      expect(result.id).toBe('ks-1');
      expect(result.title).toBe('Intro to React');
    });
  });

  describe('addUrlSource()', () => {
    it('calls service with URL source type', async () => {
      mockCreateAndProcess.mockResolvedValue(sampleRow);
      const result = await resolver.addUrlSource(
        { courseId: 'course-1', title: 'MDN', url: 'https://mdn.io' },
        makeCtx()
      );
      expect(mockCreateAndProcess).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        courseId: 'course-1',
        title: 'MDN',
        sourceType: 'URL',
        origin: 'https://mdn.io',
      });
      expect(result.id).toBe('ks-1');
    });
  });

  describe('addTextSource()', () => {
    it('calls service with TEXT source type', async () => {
      mockCreateAndProcess.mockResolvedValue(sampleRow);
      await resolver.addTextSource(
        { courseId: 'course-1', title: 'Manual', text: 'Some content' },
        makeCtx()
      );
      expect(mockCreateAndProcess).toHaveBeenCalledWith(
        expect.objectContaining({ sourceType: 'TEXT', origin: 'manual' })
      );
    });
  });

  describe('deleteKnowledgeSource()', () => {
    it('returns true after deletion', async () => {
      mockDeleteSource.mockResolvedValue(undefined);
      const result = await resolver.deleteKnowledgeSource('ks-1', makeCtx());
      expect(mockDeleteSource).toHaveBeenCalledWith('ks-1', 'tenant-1');
      expect(result).toBe(true);
    });
  });

  describe('updateKnowledgeSource()', () => {
    it('calls service.updateSource and returns mapped result', async () => {
      const updated = { ...sampleRow, title: 'Renamed Source' };
      mockUpdateSource.mockResolvedValue(updated);
      const result = await resolver.updateKnowledgeSource(
        'ks-1',
        { title: 'Renamed Source' },
        makeCtx()
      );
      expect(mockUpdateSource).toHaveBeenCalledWith('ks-1', 'tenant-1', {
        title: 'Renamed Source',
      });
      expect(result.title).toBe('Renamed Source');
    });

    it('passes metadata update through to service', async () => {
      const updated = { ...sampleRow, metadata: { lang: 'he' } };
      mockUpdateSource.mockResolvedValue(updated);
      await resolver.updateKnowledgeSource(
        'ks-1',
        { metadata: { lang: 'he' } },
        makeCtx()
      );
      expect(mockUpdateSource).toHaveBeenCalledWith('ks-1', 'tenant-1', {
        metadata: { lang: 'he' },
      });
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = { authContext: {} } as never;
      await expect(
        resolver.updateKnowledgeSource('ks-1', { title: 'X' }, ctx)
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUpdateSource).not.toHaveBeenCalled();
    });
  });

  describe('fileUrl (ResolveField)', () => {
    it('returns presigned URL when fileKey is present', async () => {
      const result = await resolver.fileUrl({
        fileKey: 'tenant-1/course-1/abc/file.pdf',
      });
      expect(result).toBe('https://minio.local/presigned');
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        'tenant-1/course-1/abc/file.pdf'
      );
    });

    it('returns null when fileKey is null', async () => {
      const result = await resolver.fileUrl({ fileKey: null });
      expect(result).toBeNull();
      expect(mockGetPresignedUrl).not.toHaveBeenCalled();
    });

    it('returns null and logs error when presigning fails', async () => {
      mockGetPresignedUrl.mockRejectedValueOnce(new Error('S3 error'));
      const result = await resolver.fileUrl({ fileKey: 'bad-key' });
      expect(result).toBeNull();
    });
  });
});
