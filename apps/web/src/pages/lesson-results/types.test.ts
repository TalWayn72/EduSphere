import { describe, it, expect } from 'vitest';
import { getResult, getString, getArray } from './types';
import type { PipelineResult, LessonAsset, LessonQueryData } from './types';

describe('lesson-results/types', () => {
  describe('getResult', () => {
    const results: PipelineResult[] = [
      {
        id: '1',
        moduleName: 'transcription',
        outputType: 'text',
        outputData: null,
      },
      { id: '2', moduleName: 'Summary', outputType: 'text', outputData: null },
    ];

    it('finds result by exact module name', () => {
      expect(getResult(results, 'transcription')).toBe(results[0]);
    });

    it('finds result by lowercase fallback match', () => {
      // getResult checks r.moduleName === moduleName.toLowerCase()
      // so searching 'Summary' matches 'Summary' exactly
      const lowerResults: PipelineResult[] = [
        {
          id: '1',
          moduleName: 'summary',
          outputType: 'text',
          outputData: null,
        },
      ];
      expect(getResult(lowerResults, 'Summary')).toBe(lowerResults[0]);
    });

    it('returns undefined for missing module', () => {
      expect(getResult(results, 'nonexistent')).toBeUndefined();
    });
  });

  describe('getString', () => {
    it('returns string value for valid key', () => {
      expect(getString({ name: 'hello' }, 'name')).toBe('hello');
    });

    it('returns null for null data', () => {
      expect(getString(null, 'key')).toBeNull();
    });

    it('returns null for undefined data', () => {
      expect(getString(undefined, 'key')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getString({ val: '' }, 'val')).toBeNull();
    });

    it('returns null for null value', () => {
      expect(getString({ val: null }, 'val')).toBeNull();
    });

    it('converts number to string', () => {
      expect(getString({ num: 42 }, 'num')).toBe('42');
    });
  });

  describe('getArray', () => {
    it('returns array for valid key', () => {
      expect(getArray({ items: [1, 2, 3] }, 'items')).toEqual([1, 2, 3]);
    });

    it('returns null for null data', () => {
      expect(getArray(null, 'key')).toBeNull();
    });

    it('returns null for undefined data', () => {
      expect(getArray(undefined, 'key')).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(getArray({ items: [] }, 'items')).toBeNull();
    });

    it('returns null for non-array', () => {
      expect(getArray({ val: 'string' }, 'val')).toBeNull();
    });
  });

  it('PipelineResult shape is valid', () => {
    const result: PipelineResult = {
      id: '1',
      moduleName: 'test',
      outputType: 'text',
      outputData: null,
    };
    expect(result.moduleName).toBe('test');
  });

  it('LessonAsset shape is valid', () => {
    const asset: LessonAsset = {
      id: '1',
      assetType: 'VIDEO',
      sourceUrl: 'https://example.com',
    };
    expect(asset.assetType).toBe('VIDEO');
  });

  it('LessonQueryData allows null lesson', () => {
    const data: LessonQueryData = { lesson: null };
    expect(data.lesson).toBeNull();
  });
});
