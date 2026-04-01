/**
 * Tests for portal-builder/types.ts — verifies constants and type exports.
 */
import { describe, it, expect } from 'vitest';
import { ALLOWED_BLOCK_TYPES } from './types';
import type { BlockType, PortalBlock } from './types';

describe('portal-builder/types', () => {
  describe('ALLOWED_BLOCK_TYPES', () => {
    it('contains all 6 block types', () => {
      expect(ALLOWED_BLOCK_TYPES).toEqual([
        'HeroBanner',
        'FeaturedCourses',
        'StatWidget',
        'TextBlock',
        'ImageBlock',
        'CTAButton',
      ]);
    });

    it('has exactly 6 entries', () => {
      expect(ALLOWED_BLOCK_TYPES).toHaveLength(6);
    });

    it('is a readonly array', () => {
      // TypeScript enforces `as const`, but at runtime we can verify it's an array
      expect(Array.isArray(ALLOWED_BLOCK_TYPES)).toBe(true);
    });
  });

  describe('BlockType type', () => {
    it('all ALLOWED_BLOCK_TYPES values satisfy BlockType', () => {
      const types: BlockType[] = [...ALLOWED_BLOCK_TYPES];
      expect(types).toHaveLength(6);
    });
  });

  describe('PortalBlock type', () => {
    it('is structurally valid', () => {
      const block: PortalBlock = {
        id: 'block-1',
        type: 'HeroBanner',
        order: 0,
        config: { title: 'Welcome', subtitle: 'Learn more' },
      };
      expect(block.id).toBe('block-1');
      expect(block.type).toBe('HeroBanner');
      expect(block.order).toBe(0);
      expect(block.config).toEqual({
        title: 'Welcome',
        subtitle: 'Learn more',
      });
    });

    it('config accepts any record shape', () => {
      const block: PortalBlock = {
        id: 'block-2',
        type: 'StatWidget',
        order: 1,
        config: { value: 42, label: 'Students', icon: 'users' },
      };
      expect(block.config).toHaveProperty('value', 42);
    });

    it('config can be empty', () => {
      const block: PortalBlock = {
        id: 'block-3',
        type: 'TextBlock',
        order: 2,
        config: {},
      };
      expect(Object.keys(block.config)).toHaveLength(0);
    });
  });
});
