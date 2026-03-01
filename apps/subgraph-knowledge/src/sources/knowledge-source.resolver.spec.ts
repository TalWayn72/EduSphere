import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── KnowledgeSourceService mock ──────────────────────────────────────────────
const mockListByCourseSources = vi.fn();
const mockFindById = vi.fn();
const mockCreateAndProcess = vi.fn();
const mockDeleteSource = vi.fn();

vi.mock('./knowledge-source.service.js', () => ({
  KnowledgeSourceService: class {
    listByCourseSources = mockListByCourseSources;
    findById = mockFindById;
    createAndProcess = mockCreateAndProcess;
    deleteSource = mockDeleteSource;
  },
}));

// ─── DB import mock ───────────────────────────────────────────────────────────
vi.mock('@edusphere/db', () => ({}));

import { KnowledgeSourceResolver } from './knowledge-source.resolver.js';
import { KnowledgeSourceService } from './knowledge-source.service.js';

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
      new KnowledgeSourceService({} as never)
    );
  });

  describe('auth check', () => {
    it('throws UnauthorizedException when tenantId missing', async () => {
      const ctx = { authContext: {} } as never;
      await expect(
        resolver.courseKnowledgeSources('c-1', ctx)
      ).rejects.toThrow(UnauthorizedException);
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
});
