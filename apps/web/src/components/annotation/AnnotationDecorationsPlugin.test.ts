/**
 * Tests for components/annotation/AnnotationDecorationsPlugin.ts
 *
 * Covers: exports exist, createAnnotationDecorationsPlugin creates a plugin,
 * createAnnotationExtension creates an extension, annotationPluginKey exported.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Mock tiptap/prosemirror dependencies ───────────────────────────────────

vi.mock('@tiptap/pm/state', () => {
  class MockPluginKey {
    key: string;
    getState = vi.fn(() => null);
    constructor(name: string) {
      this.key = `${name}$`;
    }
  }
  class MockPlugin {
    key: unknown;
    spec: unknown;
    constructor(config: Record<string, unknown>) {
      this.key = config.key;
      this.spec = config;
    }
  }
  return { Plugin: MockPlugin, PluginKey: MockPluginKey };
});

vi.mock('@tiptap/pm/view', () => {
  const mockDecorationSet = { empty: true };
  return {
    Decoration: {
      inline: vi.fn(
        (_from: number, _to: number, attrs: Record<string, unknown>) => ({
          type: 'inline',
          attrs,
        })
      ),
    },
    DecorationSet: {
      create: vi.fn(() => mockDecorationSet),
      empty: mockDecorationSet,
    },
  };
});

vi.mock('@tiptap/core', () => ({
  Extension: {
    create: vi.fn((config: Record<string, unknown>) => ({
      name: config.name,
      _config: config,
    })),
  },
}));

import {
  createAnnotationDecorationsPlugin,
  createAnnotationExtension,
  annotationPluginKey,
} from './AnnotationDecorationsPlugin';
import type { TextRangeAnnotation } from './AnnotationDecorationsPlugin';
import { AnnotationLayer } from '@/types/annotations';

describe('AnnotationDecorationsPlugin', () => {
  it('exports annotationPluginKey', () => {
    expect(annotationPluginKey).toBeDefined();
    expect(annotationPluginKey.key).toContain('annotations');
  });

  describe('createAnnotationDecorationsPlugin', () => {
    it('is exported as a function', () => {
      expect(typeof createAnnotationDecorationsPlugin).toBe('function');
    });

    it('returns a Plugin instance', () => {
      const getAnnotations = () => [] as TextRangeAnnotation[];
      const getFocusedId = () => null;
      const plugin = createAnnotationDecorationsPlugin(
        getAnnotations,
        getFocusedId
      );
      expect(plugin).toBeDefined();
      expect(plugin).toHaveProperty('key');
      expect(plugin).toHaveProperty('spec');
    });
  });

  describe('createAnnotationExtension', () => {
    it('is exported as a function', () => {
      expect(typeof createAnnotationExtension).toBe('function');
    });

    it('creates an extension named annotationDecorations', () => {
      const getAnnotations = () => [] as TextRangeAnnotation[];
      const getFocusedId = () => null;
      const ext = createAnnotationExtension(getAnnotations, getFocusedId) as {
        name: string;
      };
      expect(ext.name).toBe('annotationDecorations');
    });
  });

  describe('TextRangeAnnotation type usage', () => {
    it('accepts valid annotation objects', () => {
      const annotation: TextRangeAnnotation = {
        id: 'ann-1',
        layer: AnnotationLayer.PERSONAL,
        textRange: { from: 0, to: 10 },
      };
      expect(annotation.id).toBe('ann-1');
      expect(annotation.layer).toBe(AnnotationLayer.PERSONAL);
      expect(annotation.textRange.from).toBe(0);
      expect(annotation.textRange.to).toBe(10);
    });
  });
});
