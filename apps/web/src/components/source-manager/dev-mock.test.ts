/**
 * Tests for source-manager/dev-mock.ts — DEV_MODE mock data store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDevSources,
  devQueryFn,
  devAddSource,
  devRemoveSource,
} from './dev-mock';

describe('dev-mock', () => {
  // Note: dev-mock uses module-level mutable state. Tests should be order-independent
  // since we're adding and removing, but the initial state has 2 default sources.

  it('getDevSources returns an array of KnowledgeSource objects', () => {
    const sources = getDevSources();
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThanOrEqual(2);
    expect(sources[0]).toHaveProperty('id');
    expect(sources[0]).toHaveProperty('title');
    expect(sources[0]).toHaveProperty('sourceType');
    expect(sources[0]).toHaveProperty('status');
  });

  it('devQueryFn returns a promise resolving to a copy of sources', async () => {
    const result = await devQueryFn();
    expect(Array.isArray(result)).toBe(true);
    // Should be a copy, not the same reference
    const original = getDevSources();
    expect(result).not.toBe(original);
    expect(result).toEqual(original);
  });

  it('devAddSource creates a new source and appends it', () => {
    const beforeCount = getDevSources().length;
    const newSource = devAddSource('URL', 'New Test Source', 'https://example.com');

    expect(newSource.id).toContain('dev-src-');
    expect(newSource.title).toBe('New Test Source');
    expect(newSource.sourceType).toBe('URL');
    expect(newSource.origin).toBe('https://example.com');
    expect(newSource.status).toBe('READY');
    expect(newSource.chunkCount).toBeGreaterThanOrEqual(1);
    expect(newSource.createdAt).toBeDefined();
    expect(newSource.preview).toBeDefined();
    expect(newSource.rawContent).toBeDefined();

    const afterCount = getDevSources().length;
    expect(afterCount).toBe(beforeCount + 1);

    // Clean up
    devRemoveSource(newSource.id);
  });

  it('devAddSource with TEXT type and no origin', () => {
    const newSource = devAddSource('TEXT', 'Text Source');

    expect(newSource.sourceType).toBe('TEXT');
    expect(newSource.origin).toBeUndefined();
    expect(newSource.rawContent).toContain('Text Source');

    devRemoveSource(newSource.id);
  });

  it('devRemoveSource removes source by id', () => {
    const newSource = devAddSource('YOUTUBE', 'YT Source', 'https://youtube.com/watch');
    const beforeCount = getDevSources().length;

    devRemoveSource(newSource.id);

    const afterCount = getDevSources().length;
    expect(afterCount).toBe(beforeCount - 1);

    const found = getDevSources().find((s) => s.id === newSource.id);
    expect(found).toBeUndefined();
  });

  it('devRemoveSource with non-existent id does not change array length', () => {
    const beforeCount = getDevSources().length;
    devRemoveSource('non-existent-id');
    expect(getDevSources().length).toBe(beforeCount);
  });

  it('default sources have expected structure', () => {
    const sources = getDevSources();
    const first = sources[0];

    expect(first.id).toBe('dev-src-1');
    expect(first.sourceType).toBe('URL');
    expect(first.status).toBe('READY');
    expect(first.chunkCount).toBe(12);
    expect(first.origin).toContain('example.com');
  });

  it('devAddSource generates ids with dev-src- prefix', () => {
    const s1 = devAddSource('TEXT', 'Source 1');

    expect(s1.id).toMatch(/^dev-src-/);

    devRemoveSource(s1.id);
  });
});
