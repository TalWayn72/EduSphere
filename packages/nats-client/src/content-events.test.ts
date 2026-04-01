import { describe, it, expect } from 'vitest';
import { isContentEvent, isTranscriptionEvent } from './content-events.js';

describe('content-events type guards', () => {
  describe('isContentEvent', () => {
    const validContent = {
      type: 'content.created' as const,
      contentItemId: 'ci-001',
      courseId: 'course-001',
      tenantId: 'tenant-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid content.created event', () => {
      expect(isContentEvent(validContent)).toBe(true);
    });

    it('returns true for content.updated', () => {
      expect(isContentEvent({ ...validContent, type: 'content.updated' })).toBe(
        true
      );
    });

    it('returns true for content.published', () => {
      expect(
        isContentEvent({ ...validContent, type: 'content.published' })
      ).toBe(true);
    });

    it('returns true without optional courseId', () => {
      const { courseId: _, ...rest } = validContent;
      expect(isContentEvent(rest)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isContentEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isContentEvent(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isContentEvent('hello')).toBe(false);
    });

    it('returns false when contentItemId is missing', () => {
      const { contentItemId: _, ...rest } = validContent;
      expect(isContentEvent(rest)).toBe(false);
    });

    it('returns false when contentItemId is not a string', () => {
      expect(isContentEvent({ ...validContent, contentItemId: 42 })).toBe(
        false
      );
    });

    it('returns false for empty object', () => {
      expect(isContentEvent({})).toBe(false);
    });
  });

  describe('isTranscriptionEvent', () => {
    const validTranscription = {
      type: 'transcription.completed' as const,
      assetId: 'asset-001',
      segmentCount: 10,
      language: 'en',
    };

    it('returns true for transcription.completed', () => {
      expect(isTranscriptionEvent(validTranscription)).toBe(true);
    });

    it('returns true for transcription.failed', () => {
      expect(
        isTranscriptionEvent({
          ...validTranscription,
          type: 'transcription.failed',
          errorMessage: 'codec error',
        })
      ).toBe(true);
    });

    it('returns false for null', () => {
      expect(isTranscriptionEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isTranscriptionEvent(undefined)).toBe(false);
    });

    it('returns false when assetId is missing', () => {
      const { assetId: _, ...rest } = validTranscription;
      expect(isTranscriptionEvent(rest)).toBe(false);
    });

    it('returns false when type is not a transcription type', () => {
      expect(
        isTranscriptionEvent({ ...validTranscription, type: 'content.created' })
      ).toBe(false);
    });

    it('returns false when assetId is not a string', () => {
      expect(
        isTranscriptionEvent({ ...validTranscription, assetId: 123 })
      ).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isTranscriptionEvent({})).toBe(false);
    });
  });
});
