import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MediaQueriesService } from './media-queries.service';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDb = { select: mockSelect, update: mockUpdate };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    transcripts: {
      asset_id: 'asset_id',
      language: 'language',
      vtt_key: 'vtt_key',
    },
    media_assets: { id: 'id', alt_text: 'alt_text' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  isNotNull: vi.fn((col) => ({ isNotNull: col })),
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...c) => ({ and: c })),
  eq: vi.fn((col, val) => ({ col, val })),
  isNotNull: vi.fn((col) => ({ isNotNull: col })),
}));

vi.mock('./media-helpers', () => ({
  extractContentTypeFromKey: vi.fn(() => 'video/mp4'),
  LANG_LABELS: { he: 'Hebrew', en: 'English' } as Record<string, string>,
}));

function makeSelectChainNoLimit(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('MediaQueriesService', () => {
  let service: MediaQueriesService;
  const downloadUrlFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MediaQueriesService();
  });

  describe('getSubtitleTracks()', () => {
    it('returns subtitle tracks with presigned URLs', async () => {
      const chain = makeSelectChainNoLimit([
        { language: 'he', vttKey: 'subs/he.vtt' },
        { language: 'en', vttKey: 'subs/en.vtt' },
      ]);
      mockSelect.mockReturnValue({ from: chain.from });
      downloadUrlFn
        .mockResolvedValueOnce('https://cdn/he.vtt')
        .mockResolvedValueOnce('https://cdn/en.vtt');

      const tracks = await service.getSubtitleTracks('a1', downloadUrlFn);
      expect(tracks).toHaveLength(2);
      expect(tracks[0]).toEqual({
        language: 'he',
        label: 'Hebrew',
        src: 'https://cdn/he.vtt',
      });
      expect(tracks[1]).toEqual({
        language: 'en',
        label: 'English',
        src: 'https://cdn/en.vtt',
      });
    });

    it('returns empty array when no transcripts exist', async () => {
      const chain = makeSelectChainNoLimit([]);
      mockSelect.mockReturnValue({ from: chain.from });

      const tracks = await service.getSubtitleTracks('a1', downloadUrlFn);
      expect(tracks).toEqual([]);
    });

    it('skips tracks where vttKey is null', async () => {
      const chain = makeSelectChainNoLimit([{ language: 'he', vttKey: null }]);
      mockSelect.mockReturnValue({ from: chain.from });

      const tracks = await service.getSubtitleTracks('a1', downloadUrlFn);
      expect(tracks).toEqual([]);
    });

    it('skips tracks when downloadUrlFn throws', async () => {
      const chain = makeSelectChainNoLimit([
        { language: 'he', vttKey: 'subs/he.vtt' },
      ]);
      mockSelect.mockReturnValue({ from: chain.from });
      downloadUrlFn.mockRejectedValueOnce(new Error('S3 error'));

      const tracks = await service.getSubtitleTracks('a1', downloadUrlFn);
      expect(tracks).toEqual([]);
    });

    it('uses language code as label for unknown languages', async () => {
      const chain = makeSelectChainNoLimit([
        { language: 'fr', vttKey: 'subs/fr.vtt' },
      ]);
      mockSelect.mockReturnValue({ from: chain.from });
      downloadUrlFn.mockResolvedValueOnce('https://cdn/fr.vtt');

      const tracks = await service.getSubtitleTracks('a1', downloadUrlFn);
      expect(tracks[0]?.label).toBe('FR');
    });
  });

  describe('updateAltText()', () => {
    it('updates alt text and returns media asset result', async () => {
      const updated = {
        id: 'm1',
        course_id: 'c1',
        file_url: 'media/vid.mp4',
        title: 'My Video',
        alt_text: 'A video about Torah',
      };
      const returning = vi.fn().mockResolvedValue([updated]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });
      downloadUrlFn.mockResolvedValue('https://cdn/vid.mp4');

      const result = await service.updateAltText(
        'm1',
        'A video about Torah',
        't1',
        downloadUrlFn
      );
      expect(result.id).toBe('m1');
      expect(result.altText).toBe('A video about Torah');
      expect(result.downloadUrl).toBe('https://cdn/vid.mp4');
      expect(result.status).toBe('READY');
    });

    it('throws NotFoundException when media asset not found', async () => {
      const returning = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });

      await expect(
        service.updateAltText('bad-id', 'text', 't1', downloadUrlFn)
      ).rejects.toThrow(NotFoundException);
    });

    it('returns null downloadUrl when download URL generation fails', async () => {
      const updated = {
        id: 'm1',
        course_id: 'c1',
        file_url: 'f.mp4',
        title: 'V',
        alt_text: 'alt',
      };
      const returning = vi.fn().mockResolvedValue([updated]);
      const where = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where });
      mockUpdate.mockReturnValue({ set });
      downloadUrlFn.mockRejectedValue(new Error('fail'));

      const result = await service.updateAltText(
        'm1',
        'alt',
        't1',
        downloadUrlFn
      );
      expect(result.downloadUrl).toBeNull();
    });
  });
});
