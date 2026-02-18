import { describe, it, expect } from 'vitest';
import {
  mockVideo,
  mockBookmarks,
  mockTranscript,
  mockAnnotations,
} from './mock-content-data';

describe('mockVideo', () => {
  it('has required VideoContent fields', () => {
    expect(mockVideo.id).toBeDefined();
    expect(mockVideo.title).toBeDefined();
    expect(mockVideo.description).toBeDefined();
    expect(mockVideo.url).toBeDefined();
    expect(typeof mockVideo.duration).toBe('number');
  });

  it('has a positive duration', () => {
    expect(mockVideo.duration).toBeGreaterThan(0);
  });

  it('url points to a valid-looking URL', () => {
    expect(mockVideo.url).toMatch(/^https?:\/\//);
  });
});

describe('mockBookmarks', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(mockBookmarks)).toBe(true);
    expect(mockBookmarks.length).toBeGreaterThan(0);
  });

  it('each bookmark has id, timestamp, and label', () => {
    mockBookmarks.forEach((b) => {
      expect(typeof b.id).toBe('string');
      expect(typeof b.timestamp).toBe('number');
      expect(typeof b.label).toBe('string');
    });
  });

  it('all timestamps are non-negative', () => {
    mockBookmarks.forEach((b) => {
      expect(b.timestamp).toBeGreaterThanOrEqual(0);
    });
  });

  it('has unique IDs', () => {
    const ids = mockBookmarks.map((b) => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('mockTranscript', () => {
  it('has 20 transcript segments', () => {
    expect(mockTranscript.length).toBe(20);
  });

  it('segments are in chronological order', () => {
    for (let i = 1; i < mockTranscript.length; i++) {
      expect(mockTranscript[i].startTime).toBeGreaterThan(
        mockTranscript[i - 1].startTime
      );
    }
  });

  it('each segment has required fields', () => {
    mockTranscript.forEach((seg) => {
      expect(typeof seg.id).toBe('string');
      expect(typeof seg.startTime).toBe('number');
      expect(typeof seg.endTime).toBe('number');
      expect(typeof seg.text).toBe('string');
      expect(seg.text.length).toBeGreaterThan(0);
    });
  });

  it('each segment endTime is after startTime', () => {
    mockTranscript.forEach((seg) => {
      expect(seg.endTime).toBeGreaterThan(seg.startTime);
    });
  });
});

describe('mockAnnotations', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(mockAnnotations)).toBe(true);
    expect(mockAnnotations.length).toBeGreaterThan(0);
  });

  it('each annotation has required fields', () => {
    mockAnnotations.forEach((ann) => {
      expect(typeof ann.id).toBe('string');
      expect(typeof ann.timestamp).toBe('number');
      expect(['PERSONAL', 'SHARED', 'INSTRUCTOR', 'AI_GENERATED']).toContain(
        ann.layer
      );
      expect(typeof ann.author).toBe('string');
      expect(typeof ann.content).toBe('string');
    });
  });

  it('has unique IDs', () => {
    const ids = mockAnnotations.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
